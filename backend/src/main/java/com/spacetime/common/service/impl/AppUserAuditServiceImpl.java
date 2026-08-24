package com.spacetime.common.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditActionEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditOperatorTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * App 用户统一审核服务实现。
 * 这里集中维护记录状态和审核历史，避免移动端/后台各自散落状态逻辑。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppUserAuditServiceImpl implements AppUserAuditService {

    private final AppUserAuditRecordDao recordDao;
    private final AppUserAuditHistoryDao historyDao;
    private final PromotionEventInboxService promotionEventInboxService;

    @Override
    public AppUserAuditRecord latestRecord(Long userId, AppUserAuditTypeEnum type) {
        return recordDao.selectOne(baseUserTypeWrapper(userId, type)
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId)
                .last("LIMIT 1"));
    }

    @Override
    public AppUserAuditRecord latestEffectiveRecord(Long userId, AppUserAuditTypeEnum type) {
        return recordDao.selectOne(baseUserTypeWrapper(userId, type)
                .eq(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.APPROVED.getCode())
                .orderByDesc(AppUserAuditRecord::getAuditTime)
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId)
                .last("LIMIT 1"));
    }

    @Override
    public List<AppUserAuditRecord> effectiveRecords(Long userId, AppUserAuditTypeEnum type) {
        return recordDao.selectList(baseUserTypeWrapper(userId, type)
                .eq(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.APPROVED.getCode())
                .orderByDesc(AppUserAuditRecord::getAuditTime)
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId));
    }

    @Override
    public Page<AppUserAuditRecord> pageRecords(Page<AppUserAuditRecord> page, AppUserAuditTypeEnum type,
            String status, String auditSource, Long userId) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getAuditType, type.getCode())
                .eq(userId != null, AppUserAuditRecord::getUserId, userId)
                .eq(status != null && !status.isBlank(), AppUserAuditRecord::getStatus, status)
                .eq(auditSource != null && !auditSource.isBlank(), AppUserAuditRecord::getAuditSource, auditSource)
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId);
        return recordDao.selectPage(page, wrapper);
    }

    @Override
    @Transactional
    public AppUserAuditRecord submit(AppUserAuditRecord record) {
        if (record == null || record.getUserId() == null || record.getAuditType() == null) {
            throw new BusinessException("审核记录参数不完整");
        }
        AppUserAuditTypeEnum type = AppUserAuditTypeEnum.getByCode(record.getAuditType());
        if (type == null) {
            throw new BusinessException("不支持的审核类型");
        }
        record.setAuditGroup(type.getGroup());
        if (record.getStatus() == null) {
            record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        }
        if (record.getAuditSource() == null) {
            record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        }
        if (record.getSubmitTime() == null) {
            record.setSubmitTime(LocalDateTime.now());
        }
        recordDao.insert(record);
        appendHistory(record, null, record.getStatus(), AppUserAuditActionEnum.SUBMIT,
                null, AuditOperatorTypeEnum.USER, record.getUserId(), "用户");
        return record;
    }

    @Override
    @Transactional
    public void machineStart(Long recordId, Long providerTaskId, String machineSignalJson) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        record.setStatus(AppUserAuditStatusEnum.REVIEWING.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setProviderTaskId(providerTaskId);
        record.setMachineSignalJson(machineSignalJson);
        record.setRejectReason(null);
        record.setAuditTime(null);
        recordDao.updateAuditResult(record);
        appendHistory(record, fromStatus, record.getStatus(), AppUserAuditActionEnum.MACHINE_START,
                null, AuditOperatorTypeEnum.PROVIDER, providerTaskId, "Provider");
    }

    @Override
    @Transactional
    public void machineApprove(Long recordId, Long providerTaskId, String machineSignalJson) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        record.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setProviderTaskId(providerTaskId);
        record.setMachineSignalJson(machineSignalJson);
        record.setRejectReason(null);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateAuditResult(record);
        appendHistory(record, fromStatus, record.getStatus(), AppUserAuditActionEnum.MACHINE_PASS,
                null, AuditOperatorTypeEnum.PROVIDER, providerTaskId, "Provider");
        enqueuePromotionAuditEvent(record);
    }

    @Override
    @Transactional
    public void machineReject(Long recordId, Long providerTaskId, String machineSignalJson, String reason) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        record.setStatus(AppUserAuditStatusEnum.REJECTED.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setProviderTaskId(providerTaskId);
        record.setMachineSignalJson(machineSignalJson);
        record.setRejectReason(reason);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateAuditResult(record);
        appendHistory(record, fromStatus, record.getStatus(), AppUserAuditActionEnum.MACHINE_REJECT,
                reason, AuditOperatorTypeEnum.PROVIDER, providerTaskId, "Provider");
    }

    @Override
    @Transactional
    public void manualAudit(Long recordId, String action, String reason, Long auditorId, String auditorName) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        AppUserAuditActionEnum historyAction;
        String targetStatus;
        if ("APPROVE".equals(action)) {
            targetStatus = AppUserAuditStatusEnum.APPROVED.getCode();
            historyAction = AppUserAuditActionEnum.MANUAL_APPROVE;
            record.setRejectReason(null);
            record.setExpiredReason(null);
        } else if ("REJECT".equals(action)) {
            targetStatus = AppUserAuditStatusEnum.REJECTED.getCode();
            historyAction = AppUserAuditActionEnum.MANUAL_REJECT;
            record.setRejectReason(reason);
            record.setExpiredReason(null);
        } else if ("EXPIRE".equals(action)) {
            targetStatus = AppUserAuditStatusEnum.EXPIRED.getCode();
            historyAction = AppUserAuditActionEnum.MANUAL_EXPIRE;
            record.setRejectReason(null);
            record.setExpiredReason(reason);
        } else {
            throw new BusinessException("不支持的审核动作");
        }
        record.setStatus(targetStatus);
        record.setAuditSource(AuditSourceEnum.MANUAL.getCode());
        record.setAuditorId(auditorId);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateAuditResult(record);
        appendHistory(record, fromStatus, targetStatus, historyAction, reason,
                AuditOperatorTypeEnum.ADMIN, auditorId, auditorName);
        if (AppUserAuditStatusEnum.APPROVED.getCode().equals(targetStatus)) {
            enqueuePromotionAuditEvent(record);
        }
    }

    @Override
    @Transactional
    public void systemExpire(Long recordId, String reason) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        record.setStatus(AppUserAuditStatusEnum.EXPIRED.getCode());
        record.setExpiredReason(reason);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateAuditResult(record);
        appendHistory(record, fromStatus, record.getStatus(), AppUserAuditActionEnum.SYSTEM_EXPIRE,
                reason, AuditOperatorTypeEnum.SYSTEM, null, "系统");
    }

    @Override
    public boolean latestApproved(Long userId, AppUserAuditTypeEnum type) {
        AppUserAuditRecord latest = latestRecord(userId, type);
        return latest != null && AppUserAuditStatusEnum.APPROVED.getCode().equals(latest.getStatus());
    }

    @Override
    public boolean hasEffective(Long userId, AppUserAuditTypeEnum type) {
        return latestEffectiveRecord(userId, type) != null;
    }

    @Override
    public int certificationApprovedCount(Long userId) {
        int count = 0;
        if (hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME)) count++;
        if (latestApproved(userId, AppUserAuditTypeEnum.AVATAR)) count++;
        if (hasEffective(userId, AppUserAuditTypeEnum.EDUCATION)) count++;
        return count;
    }

    @Override
    public Map<Long, Integer> certificationApprovedCounts(Collection<Long> userIds) {
        List<Long> ids = userIds == null ? List.of() : userIds.stream()
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        List<AppUserAuditRecord> records = recordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                .in(AppUserAuditRecord::getUserId, ids)
                .in(AppUserAuditRecord::getAuditType, List.of(
                        AppUserAuditTypeEnum.REAL_NAME.getCode(),
                        AppUserAuditTypeEnum.AVATAR.getCode(),
                        AppUserAuditTypeEnum.EDUCATION.getCode())));
        Map<Long, Set<String>> approvedTypes = new HashMap<>();
        Map<Long, AppUserAuditRecord> latestAvatars = new HashMap<>();
        Comparator<AppUserAuditRecord> latestComparator = Comparator
                .comparing(AppUserAuditRecord::getSubmitTime,
                        Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(AppUserAuditRecord::getId,
                        Comparator.nullsFirst(Comparator.naturalOrder()));
        for (AppUserAuditRecord record : records == null ? List.<AppUserAuditRecord>of() : records) {
            if (record == null || record.getUserId() == null) {
                continue;
            }
            if (AppUserAuditTypeEnum.AVATAR.getCode().equals(record.getAuditType())) {
                latestAvatars.merge(record.getUserId(), record,
                        (left, right) -> latestComparator.compare(left, right) >= 0 ? left : right);
            } else if (AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus())) {
                approvedTypes.computeIfAbsent(record.getUserId(), ignored -> new HashSet<>())
                        .add(record.getAuditType());
            }
        }
        latestAvatars.forEach((userId, record) -> {
            if (AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus())) {
                approvedTypes.computeIfAbsent(userId, ignored -> new HashSet<>())
                        .add(AppUserAuditTypeEnum.AVATAR.getCode());
            }
        });
        Map<Long, Integer> result = new LinkedHashMap<>();
        ids.forEach(id -> result.put(id, approvedTypes.getOrDefault(id, Set.of()).size()));
        return result;
    }

    private LambdaQueryWrapper<AppUserAuditRecord> baseUserTypeWrapper(Long userId, AppUserAuditTypeEnum type) {
        return new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getUserId, userId)
                .eq(AppUserAuditRecord::getAuditType, type.getCode());
    }

    private void enqueuePromotionAuditEvent(AppUserAuditRecord record) {
        if (AppUserAuditTypeEnum.AVATAR.getCode().equals(record.getAuditType())) {
            promotionEventInboxService.enqueueBusinessEvent(
                    "profile:" + record.getUserId(),
                    PromotionRewardEventEnum.PROFILE_COMPLETE_REWARD.getCode(),
                    record.getUserId(),
                    String.valueOf(record.getId()));
        }
        if ((AppUserAuditTypeEnum.REAL_NAME.getCode().equals(record.getAuditType())
                || AppUserAuditTypeEnum.EDUCATION.getCode().equals(record.getAuditType()))
                && hasEffective(record.getUserId(), AppUserAuditTypeEnum.REAL_NAME)
                && hasEffective(record.getUserId(), AppUserAuditTypeEnum.EDUCATION)) {
            promotionEventInboxService.enqueueBusinessEvent(
                    "verify:" + record.getUserId(),
                    PromotionRewardEventEnum.VERIFY_COMPLETE_REWARD.getCode(),
                    record.getUserId(),
                    String.valueOf(record.getId()));
        }
    }

    private AppUserAuditRecord requireRecord(Long id) {
        AppUserAuditRecord record = recordDao.selectById(id);
        if (record == null) {
            throw new BusinessException("审核记录不存在");
        }
        return record;
    }

    private void appendHistory(AppUserAuditRecord record, String fromStatus, String toStatus,
            AppUserAuditActionEnum action, String reason, AuditOperatorTypeEnum operatorType,
            Long operatorId, String operatorName) {
        AppUserAuditHistory history = new AppUserAuditHistory();
        history.setAuditRecordId(record.getId());
        history.setUserId(record.getUserId());
        history.setAuditType(record.getAuditType());
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setAuditSource(record.getAuditSource());
        history.setAction(action.getCode());
        history.setReason(reason);
        history.setOperatorType(operatorType.getCode());
        history.setOperatorId(operatorId);
        history.setOperatorName(operatorName);
        history.setProviderTaskId(record.getProviderTaskId());
        history.setSnapshotJson(snapshotJson(record));
        historyDao.insert(history);
    }

    /**
     * 仅在审核通过后更新对外资料投影，待审或驳回内容不会提前覆盖旧的有效内容。
     */
    /** 审核历史只保存必要脱敏快照，不依赖审核记录表冗余 JSON 字段。 */
    private String snapshotJson(AppUserAuditRecord record) {
        StringBuilder json = new StringBuilder("{");
        appendJson(json, "auditType", record.getAuditType());
        appendJson(json, "status", record.getStatus());
        appendJson(json, "mediaUrl", record.getMediaUrl());
        appendJson(json, "thumbUrl", record.getThumbUrl());
        appendJson(json, "duration", record.getDuration());
        appendJson(json, "contentText", record.getContentText() == null ? null : truncate(record.getContentText(), 24));
        appendJson(json, "realName", maskRealName(record.getRealName()));
        appendJson(json, "idCard", maskIdCard(record.getIdCard()));
        appendJson(json, "boundPhone", maskPhone(record.getBoundPhone()));
        appendJson(json, "educationMethod", record.getEducationMethod());
        appendJson(json, "schoolName", record.getSchoolName());
        appendRawJson(json, "material", record.getMaterialJson());
        appendRawJson(json, "machineSignal", record.getMachineSignalJson());
        if (json.charAt(json.length() - 1) == ',') {
            json.deleteCharAt(json.length() - 1);
        }
        json.append('}');
        return json.toString();
    }

    private void appendJson(StringBuilder json, String key, Object value) {
        if (value == null) {
            return;
        }
        json.append('"').append(key).append("\":");
        if (value instanceof Number) {
            json.append(value);
        } else {
            json.append('"').append(escapeJson(String.valueOf(value))).append('"');
        }
        json.append(',');
    }

    private void appendRawJson(StringBuilder json, String key, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        json.append('"').append(key).append("\":").append(value).append(',');
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.codePointCount(0, value.length()) <= maxLength) {
            return value;
        }
        return value.substring(0, value.offsetByCodePoints(0, maxLength));
    }

    private String maskRealName(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.charAt(0) + "*";
    }

    private String maskIdCard(String value) {
        if (value == null || value.length() < 8) {
            return value;
        }
        return value.substring(0, 3) + "***********" + value.substring(value.length() - 4);
    }

    private String maskPhone(String value) {
        if (value == null || value.length() < 7) {
            return value;
        }
        return value.substring(0, 3) + "****" + value.substring(value.length() - 4);
    }

    private String escapeJson(String value) {
        if (value == null) {
            return null;
        }
        StringBuilder escaped = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isHighSurrogate(c)) {
                if (i + 1 < value.length() && Character.isLowSurrogate(value.charAt(i + 1))) {
                    escaped.append(c).append(value.charAt(i + 1));
                    i++;
                } else {
                    escaped.append('\uFFFD');
                }
            } else if (Character.isLowSurrogate(c)) {
                escaped.append('\uFFFD');
            } else {
                switch (c) {
                    case '"' -> escaped.append("\\\"");
                    case '\\' -> escaped.append("\\\\");
                    case '\b' -> escaped.append("\\b");
                    case '\f' -> escaped.append("\\f");
                    case '\n' -> escaped.append("\\n");
                    case '\r' -> escaped.append("\\r");
                    case '\t' -> escaped.append("\\t");
                    default -> {
                        if (c < 0x20) {
                            escaped.append(String.format("\\u%04x", (int) c));
                        } else {
                            escaped.append(c);
                        }
                    }
                }
            }
        }
        return escaped.toString();
    }
}
