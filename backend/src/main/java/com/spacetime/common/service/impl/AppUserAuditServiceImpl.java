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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * App 用户统一审核服务实现。
 * 这里集中维护记录状态、当前有效标记和审核历史，避免移动端/后台各自散落状态逻辑。
 */
@Service
@RequiredArgsConstructor
public class AppUserAuditServiceImpl implements AppUserAuditService {

    private final AppUserAuditRecordDao recordDao;
    private final AppUserAuditHistoryDao historyDao;

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
                .eq(AppUserAuditRecord::getCurrentEffective, 1)
                .orderByDesc(AppUserAuditRecord::getAuditTime)
                .orderByDesc(AppUserAuditRecord::getId)
                .last("LIMIT 1"));
    }

    @Override
    public List<AppUserAuditRecord> effectiveRecords(Long userId, AppUserAuditTypeEnum type) {
        return recordDao.selectList(baseUserTypeWrapper(userId, type)
                .eq(AppUserAuditRecord::getCurrentEffective, 1)
                .orderByDesc(AppUserAuditRecord::getAuditTime)
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
        if (record.getCurrentEffective() == null) {
            record.setCurrentEffective(0);
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
    public void machineApprove(Long recordId, Long providerTaskId, String machineSignalJson) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        markEffectiveForApproved(record);
        record.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setProviderTaskId(providerTaskId);
        record.setMachineSignalJson(machineSignalJson);
        record.setRejectReason(null);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateById(record);
        appendHistory(record, fromStatus, record.getStatus(), AppUserAuditActionEnum.MACHINE_PASS,
                null, AuditOperatorTypeEnum.PROVIDER, providerTaskId, "Provider");
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
        record.setCurrentEffective(0);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateById(record);
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
            markEffectiveForApproved(record);
            record.setRejectReason(null);
            record.setExpiredReason(null);
        } else if ("REJECT".equals(action)) {
            targetStatus = AppUserAuditStatusEnum.REJECTED.getCode();
            historyAction = AppUserAuditActionEnum.MANUAL_REJECT;
            record.setRejectReason(reason);
            record.setCurrentEffective(0);
        } else if ("EXPIRE".equals(action)) {
            targetStatus = AppUserAuditStatusEnum.EXPIRED.getCode();
            historyAction = AppUserAuditActionEnum.MANUAL_EXPIRE;
            record.setExpiredReason(reason);
            record.setCurrentEffective(0);
        } else {
            throw new BusinessException("不支持的审核动作");
        }
        record.setStatus(targetStatus);
        record.setAuditSource(AuditSourceEnum.MANUAL.getCode());
        record.setAuditorId(auditorId);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateById(record);
        appendHistory(record, fromStatus, targetStatus, historyAction, reason,
                AuditOperatorTypeEnum.ADMIN, auditorId, auditorName);
    }

    @Override
    @Transactional
    public void systemExpire(Long recordId, String reason) {
        AppUserAuditRecord record = requireRecord(recordId);
        String fromStatus = record.getStatus();
        record.setStatus(AppUserAuditStatusEnum.EXPIRED.getCode());
        record.setExpiredReason(reason);
        record.setCurrentEffective(0);
        record.setAuditTime(LocalDateTime.now());
        recordDao.updateById(record);
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

    /** 通过时按类型维护 current_effective；相册允许多张并存，其他类型同类只保留一条生效。 */
    private void markEffectiveForApproved(AppUserAuditRecord record) {
        AppUserAuditTypeEnum type = AppUserAuditTypeEnum.getByCode(record.getAuditType());
        if (type != AppUserAuditTypeEnum.ALBUM_PHOTO) {
            for (AppUserAuditRecord effective : effectiveRecords(record.getUserId(), type)) {
                if (!effective.getId().equals(record.getId())) {
                    effective.setCurrentEffective(0);
                    recordDao.updateById(effective);
                }
            }
        }
        record.setCurrentEffective(1);
    }

    private LambdaQueryWrapper<AppUserAuditRecord> baseUserTypeWrapper(Long userId, AppUserAuditTypeEnum type) {
        return new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getUserId, userId)
                .eq(AppUserAuditRecord::getAuditType, type.getCode());
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
        history.setSnapshotJson(record.getMaskedPayloadJson());
        historyDao.insert(history);
    }
}
