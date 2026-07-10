package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.AuditHistoryVO;
import com.spacetime.admin.dto.response.FieldEntry;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.dto.response.VerificationStatsVO;
import com.spacetime.admin.dto.response.VerificationVO;
import com.spacetime.admin.service.VerificationAdminService;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.AppUserAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 管理后台认证审核服务实现。
 * 实名、学历、头像统一读取 app_user_audit_record，详情统一带审核历史分页。
 */
@Service
@RequiredArgsConstructor
public class VerificationAdminServiceImpl implements VerificationAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserAuditHistoryDao historyDao;
    private final AppUserAuditService auditService;
    private final AppUserDao appUserDao;

    @Override
    public Page<VerificationVO> getRealNamePage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.REAL_NAME);
    }

    @Override
    public Page<VerificationVO> getEducationPage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.EDUCATION);
    }

    @Override
    public Page<VerificationVO> getAvatarPage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.AVATAR);
    }

    @Override
    public VerificationStatsVO getAvatarStats() {
        return statsOf(AppUserAuditTypeEnum.AVATAR);
    }

    @Override
    public VerificationStatsVO getRealNameStats() {
        return statsOf(AppUserAuditTypeEnum.REAL_NAME);
    }

    @Override
    public VerificationStatsVO getEducationStats() {
        return statsOf(AppUserAuditTypeEnum.EDUCATION);
    }

    private VerificationStatsVO statsOf(AppUserAuditTypeEnum type) {
        VerificationStatsVO vo = new VerificationStatsVO();
        vo.setPendingCount(countByStatus(type, AppUserAuditStatusEnum.PENDING.getCode(), null));
        vo.setReviewingCount(countByStatus(type, AppUserAuditStatusEnum.REVIEWING.getCode(), null));
        vo.setApprovedTodayCount(countByStatus(type, AppUserAuditStatusEnum.APPROVED.getCode(), "TODAY"));
        vo.setRejectedTodayCount(countByStatus(type, AppUserAuditStatusEnum.REJECTED.getCode(), "TODAY"));
        vo.setExpiredCount(countByStatus(type, AppUserAuditStatusEnum.EXPIRED.getCode(), null));
        return vo;
    }

    private Long countByStatus(AppUserAuditTypeEnum type, String status, String submitTime) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getAuditType, type.getCode())
                .eq(AppUserAuditRecord::getStatus, status);
        if ("TODAY".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getAuditTime, LocalDateTime.now().toLocalDate().atStartOfDay());
        }
        return auditRecordDao.count(wrapper);
    }

    private Page<VerificationVO> queryPage(VerificationPageReq req, AppUserAuditTypeEnum type) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getAuditType, type.getCode())
                .eq(req.getUserId() != null, AppUserAuditRecord::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getStatus()), AppUserAuditRecord::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditSource()), AppUserAuditRecord::getAuditSource, req.getAuditSource())
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId);
        applyEducationMethodFilter(wrapper, type, req.getEducationMethod());
        applyKeyword(req, wrapper);
        applySubmitTimeFilter(wrapper, req.getSubmitTime());
        Page<AppUserAuditRecord> page = auditRecordDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        return toPage(page, type);
    }

    private void applyEducationMethodFilter(LambdaQueryWrapper<AppUserAuditRecord> wrapper,
            AppUserAuditTypeEnum type, String educationMethod) {
        if (type != AppUserAuditTypeEnum.EDUCATION || StrUtil.isBlank(educationMethod)) {
            return;
        }
        if ("MATERIAL_UPLOAD".equals(educationMethod)) {
            wrapper.in(AppUserAuditRecord::getEducationMethod, List.of("MATERIAL_UPLOAD", "STUDENT_CARD"));
        } else {
            wrapper.eq(AppUserAuditRecord::getEducationMethod, educationMethod);
        }
    }

    /**
     * 用户搜索需要覆盖昵称、手机号、标签、实名、身份证和用户ID。
     */
    private void applyKeyword(VerificationPageReq req, LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        if (StrUtil.isBlank(req.getKeyword())) {
            return;
        }
        String keyword = req.getKeyword().trim();
        Set<Long> userIds = new LinkedHashSet<>();
        if (keyword.matches("\\d+")) {
            userIds.add(Long.parseLong(keyword));
        }
        userIds.addAll(appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                        .like(AppUser::getNickname, keyword)
                        .or()
                        .like(AppUser::getPhone, keyword)
                        .or()
                        .like(AppUser::getTags, keyword))
                .stream().map(AppUser::getId).toList());
        userIds.addAll(auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.REAL_NAME.getCode())
                        .and(q -> q.like(AppUserAuditRecord::getRealName, keyword)
                                .or()
                                .like(AppUserAuditRecord::getIdCard, keyword)))
                .stream().map(AppUserAuditRecord::getUserId).toList());
        if (userIds.isEmpty()) {
            wrapper.eq(AppUserAuditRecord::getUserId, -1L);
        } else {
            wrapper.in(AppUserAuditRecord::getUserId, userIds);
        }
    }

    private void applySubmitTimeFilter(LambdaQueryWrapper<AppUserAuditRecord> wrapper, String submitTime) {
        if ("TODAY".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getSubmitTime, LocalDateTime.now().toLocalDate().atStartOfDay());
        } else if ("LAST_7_DAYS".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getSubmitTime, LocalDateTime.now().minusDays(7));
        }
    }

    private Page<VerificationVO> toPage(Page<AppUserAuditRecord> page, AppUserAuditTypeEnum type) {
        List<AppUserAuditRecord> records = page.getRecords();
        Map<Long, AppUser> userMap = records.isEmpty() ? Map.of() : appUserDao.selectList(
                        new LambdaQueryWrapper<AppUser>().in(AppUser::getId,
                                records.stream().map(AppUserAuditRecord::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<VerificationVO> vos = new ArrayList<>();
        for (AppUserAuditRecord record : records) {
            AppUser user = userMap.get(record.getUserId());
            VerificationVO vo = baseRow(record, user);
            if (type == AppUserAuditTypeEnum.REAL_NAME) {
                vo.setPhone(maskPhone(record.getBoundPhone()));
                vo.setRealName(maskRealName(record.getRealName()));
                vo.setIdCard(maskIdCard(record.getIdCard()));
            } else if (type == AppUserAuditTypeEnum.EDUCATION) {
                vo.setEducationIdentity(identityLabel(user == null ? null : user.getIdentity()));
                vo.setEducationMaterialSummary(educationMaterialSummary(record));
            } else if (type == AppUserAuditTypeEnum.AVATAR) {
                vo.setAvatarUrl(StrUtil.blankToDefault(record.getMediaUrl(), user == null ? null : user.getAvatar()));
            }
            vos.add(vo);
        }
        Page<VerificationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(vos);
        return result;
    }

    private VerificationVO baseRow(AppUserAuditRecord record, AppUser user) {
        VerificationVO vo = new VerificationVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(reason(record));
        vo.setSubmitTime(format(record.getSubmitTime()));
        vo.setResultTime(format(record.getAuditTime()));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getRealNameDetail(Long id) {
        return getRealNameDetail(id, 1, 5);
    }

    @Override
    public VerificationAuditDetailVO getRealNameDetail(Long id, int historyPage, int historySize) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.REAL_NAME);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setFields(List.of(
                new FieldEntry("真实姓名", maskRealName(record.getRealName())),
                new FieldEntry("手机号", maskPhone(record.getBoundPhone())),
                new FieldEntry("身份证号", maskIdCard(record.getIdCard()))
        ));
        vo.setSensitiveFields(List.of(
                new FieldEntry("真实姓名", record.getRealName()),
                new FieldEntry("手机号", record.getBoundPhone()),
                new FieldEntry("身份证号", record.getIdCard())
        ));
        vo.setHistoryPage(historyPage(record.getId(), historyPage, historySize));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getEducationDetail(Long id) {
        return getEducationDetail(id, 1, 5);
    }

    @Override
    public VerificationAuditDetailVO getEducationDetail(Long id, int historyPage, int historySize) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.EDUCATION);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setFields(List.of(
                new FieldEntry("学习名称", StrUtil.blankToDefault(record.getSchoolName(), user == null ? null : user.getSchool())),
                new FieldEntry("身份", identityLabel(user == null ? null : user.getIdentity())),
                new FieldEntry("学历", user == null ? null : user.getEducationLevel()),
                new FieldEntry("认证方式", educationMethodLabel(record.getEducationMethod())),
                new FieldEntry("姓名", record.getRealName()),
                new FieldEntry("学信网验证码", "CHSI".equals(record.getEducationMethod()) ? educationMaterialSummary(record) : null),
                new FieldEntry("证书编号", "DIPLOMA_NO".equals(record.getEducationMethod()) ? educationMaterialSummary(record) : null),
                new FieldEntry("证书材料", ("MATERIAL_UPLOAD".equals(record.getEducationMethod()) || "STUDENT_CARD".equals(record.getEducationMethod()))
                        ? educationMaterialSummary(record) : null)
        ));
        vo.setHistoryPage(historyPage(record.getId(), historyPage, historySize));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getAvatarDetail(Long id) {
        return getAvatarDetail(id, 1, 5);
    }

    @Override
    public VerificationAuditDetailVO getAvatarDetail(Long id, int historyPage, int historySize) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.AVATAR);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setMediaUrl(StrUtil.blankToDefault(record.getMediaUrl(), user == null ? null : user.getAvatar()));
        vo.setThumbUrl(record.getThumbUrl());
        vo.setFields(List.of(
                new FieldEntry("头像图片", StrUtil.blankToDefault(record.getMediaUrl(), user == null ? null : user.getAvatar())),
                new FieldEntry("媒体ID", String.valueOf(record.getId()))
        ));
        vo.setHistoryPage(historyPage(record.getId(), historyPage, historySize));
        return vo;
    }

    private VerificationAuditDetailVO baseDetail(AppUserAuditRecord record, AppUser user) {
        VerificationAuditDetailVO vo = new VerificationAuditDetailVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setVerifyLevel(auditService.certificationApprovedCount(record.getUserId()));
        vo.setSubmitTime(format(record.getSubmitTime()));
        vo.setResultTime(format(record.getAuditTime()));
        vo.setRejectReason(reason(record));
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        return vo;
    }

    private Page<AuditHistoryVO> historyPage(Long recordId, int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Page<AppUserAuditHistory> raw = historyDao.selectPage(new Page<>(safePage, safeSize),
                new LambdaQueryWrapper<AppUserAuditHistory>()
                        .eq(AppUserAuditHistory::getAuditRecordId, recordId)
                        .orderByDesc(AppUserAuditHistory::getCreateTime)
                        .orderByDesc(AppUserAuditHistory::getId));
        Page<AuditHistoryVO> result = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        result.setRecords(raw.getRecords().stream().map(this::toHistoryVO).toList());
        return result;
    }

    private AuditHistoryVO toHistoryVO(AppUserAuditHistory history) {
        AuditHistoryVO vo = new AuditHistoryVO();
        vo.setId(history.getId());
        vo.setAuditRecordId(history.getAuditRecordId());
        vo.setFromStatus(history.getFromStatus());
        vo.setToStatus(history.getToStatus());
        vo.setAuditSource(history.getAuditSource());
        vo.setAction(history.getAction());
        vo.setReason(history.getReason());
        vo.setOperatorType(history.getOperatorType());
        vo.setOperatorName(history.getOperatorName());
        vo.setProviderTaskId(history.getProviderTaskId());
        vo.setCreateTime(format(history.getCreateTime()));
        return vo;
    }

    @Override
    @Transactional
    public void auditRealName(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.REAL_NAME);
        audit(id, req);
    }

    @Override
    @Transactional
    public void auditEducation(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.EDUCATION);
        audit(id, req);
    }

    @Override
    @Transactional
    public void auditAvatar(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.AVATAR);
        audit(id, req);
    }

    private void audit(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
        UserContext ctx = UserContextHolder.get();
        auditService.manualAudit(id, req.getAction(), req.getRejectReason(),
                ctx == null ? null : ctx.getId(), ctx == null ? "管理员" : ctx.getNickname());
    }

    private void validateAuditReq(ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction()) && !"EXPIRE".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        if (!req.isRejectReasonValid()) {
            throw new BusinessException("驳回或失效时必须填写原因");
        }
    }

    private AppUserAuditRecord requireRecord(Long id, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = auditRecordDao.selectById(id);
        if (record == null || !type.getCode().equals(record.getAuditType())) {
            throw new BusinessException("审核记录不存在");
        }
        return record;
    }

    private String identityLabel(String identity) {
        if (StrUtil.isBlank(identity)) {
            return "-";
        }
        if ("STUDENT".equals(identity) || "在校生".equals(identity)) {
            return "在校生";
        }
        if ("WORKER".equals(identity) || "PROFESSIONAL".equals(identity) || "职场人".equals(identity)) {
            return "职场人";
        }
        return identity;
    }

    private String educationMaterialSummary(AppUserAuditRecord record) {
        String method = record.getEducationMethod();
        if ("CHSI".equals(method)) {
            return firstJsonValue(record.getMaterialJson(), "verificationCode", "chsiCode", "code");
        }
        if ("DIPLOMA_NO".equals(method)) {
            return firstJsonValue(record.getMaterialJson(), "diplomaNo", "certificateNo", "certNo");
        }
        if ("MATERIAL_UPLOAD".equals(method) || "STUDENT_CARD".equals(method)) {
            String links = materialLinks(record.getMaterialJson());
            return StrUtil.blankToDefault(links, "材料链接");
        }
        return StrUtil.blankToDefault(record.getMaterialJson(), StrUtil.blankToDefault(method, "-"));
    }

    private String educationMethodLabel(String method) {
        if ("CHSI".equals(method)) {
            return "学信网验证码";
        }
        if ("DIPLOMA_NO".equals(method)) {
            return "证书编号";
        }
        if ("MATERIAL_UPLOAD".equals(method) || "STUDENT_CARD".equals(method)) {
            return "证书材料";
        }
        return StrUtil.blankToDefault(method, "-");
    }

    private String firstJsonValue(String json, String... keys) {
        if (StrUtil.isBlank(json)) {
            return "-";
        }
        for (String key : keys) {
            String marker = "\"" + key + "\"";
            int keyIndex = json.indexOf(marker);
            if (keyIndex < 0) {
                continue;
            }
            int colon = json.indexOf(':', keyIndex + marker.length());
            if (colon < 0) {
                continue;
            }
            int start = colon + 1;
            while (start < json.length() && Character.isWhitespace(json.charAt(start))) {
                start++;
            }
            if (start < json.length() && json.charAt(start) == '"') {
                int end = json.indexOf('"', start + 1);
                if (end > start) {
                    return json.substring(start + 1, end);
                }
            }
        }
        return json;
    }

    private String materialLinks(String json) {
        if (StrUtil.isBlank(json)) {
            return "";
        }
        List<String> links = new ArrayList<>();
        int index = 0;
        while (index < json.length()) {
            int start = json.indexOf("http", index);
            if (start < 0) {
                break;
            }
            int end = start;
            while (end < json.length() && "\"'\\] },\r\n\t".indexOf(json.charAt(end)) < 0) {
                end++;
            }
            links.add(json.substring(start, end));
            index = end;
        }
        return String.join("、", links);
    }

    private String reason(AppUserAuditRecord record) {
        return record.getRejectReason() != null ? record.getRejectReason() : record.getExpiredReason();
    }

    private String format(LocalDateTime time) {
        return time == null ? null : time.format(FMT);
    }

    private String maskPhone(String phone) {
        if (StrUtil.isBlank(phone) || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private String maskRealName(String name) {
        if (StrUtil.isBlank(name) || name.length() <= 1) return name;
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }

    private String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) return idCard;
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }
}
