package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.AvatarVerifyReq;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 移动端认证服务实现。
 * 当前以 app_user_audit_record 为事实来源，不再依赖认证汇总快照表。
 */
@Service
@RequiredArgsConstructor
public class VerificationServiceImpl implements VerificationService {

    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String NOT_SUBMITTED = "NOT_SUBMITTED";

    private final AppUserDao appUserDao;
    private final AppUserAuditService auditService;

    /** 查询当前用户三重认证状态，移动端本人看到的是该类型最新提交记录状态。 */
    @Override
    public VerificationStatusVO getStatus(Long userId) {
        return toStatusVO(userId);
    }

    /** 提交实名认证；当前 Provider mock 成功，写入提交历史和机审通过历史。 */
    @Override
    @Transactional
    public VerificationStatusVO submitRealName(Long userId, RealNameSubmitReq req) {
        if (req == null || !Boolean.TRUE.equals(req.getSinglePromise())) {
            throw new BusinessException("singlePromise 必须确认");
        }
        if (auditService.hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME)) {
            throw new BusinessException("已完成实名认证，无需重复提交");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.REAL_NAME.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setRealName(req.getRealName());
        record.setRealNameHash(sha256(normalize(req.getRealName())));
        record.setIdCard(req.getIdCard());
        record.setIdCardHash(sha256(normalize(req.getIdCard())));
        auditService.submit(record);
        auditService.machineApprove(record.getId(), null, "{\"mocked\":true,\"result\":\"pass\"}");
        return toStatusVO(userId);
    }

    /** 提交学历认证；当前进入待审核，由后台人工或后续 Provider 更新终态。 */
    @Override
    @Transactional
    public VerificationStatusVO submitEducation(Long userId, EducationSubmitReq req) {
        if (!auditService.hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME)) {
            throw new BusinessException("请先完成实名认证");
        }
        if (req == null) {
            throw new BusinessException("学历认证参数不能为空");
        }
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.EDUCATION);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException("学历认证审核中，请耐心等待");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.EDUCATION.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setEducationMethod(req.getEducationMethod());
        record.setSchoolName(req.getSchool());
        record.setMaterialJson(educationMaterialJson(req));
        auditService.submit(record);
        return toStatusVO(userId);
    }

    /** 提交头像认证；当前头像安全 Provider mock 成功，头像业务只看最新头像记录。 */
    @Override
    @Transactional
    public VerificationStatusVO verifyAvatar(Long userId, AvatarVerifyReq req) {
        AppUser user = appUserDao.selectById(userId);
        boolean hasAvatarMedia = req != null && req.getMediaId() != null;
        if (user == null || (user.getAvatar() == null && !hasAvatarMedia)) {
            throw new BusinessException("请先上传头像");
        }
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            if (hasAvatarMedia && req.getMediaId().equals(latest.getId())) {
                auditService.machineApprove(latest.getId(), null, "{\"mocked\":true,\"result\":\"pass\"}");
                return toStatusVO(userId);
            }
            throw new BusinessException("头像认证审核中，请耐心等待");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.AVATAR.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setMediaUrl(user.getAvatar());
        record.setMaterialJson("{\"mediaId\":" + (req == null ? "null" : req.getMediaId()) + "}");
        auditService.submit(record);
        auditService.machineApprove(record.getId(), null, "{\"mocked\":true,\"result\":\"pass\"}");
        return toStatusVO(userId);
    }

    private VerificationStatusVO toStatusVO(Long userId) {
        AppUserAuditRecord realName = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = auditService.latestRecord(userId, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR);
        VerificationStatusVO vo = new VerificationStatusVO();
        vo.setRealNameStatus(status(realName));
        vo.setRealNameRejectReason(reason(realName));
        vo.setRealNameSubmitTime(formatTime(realName == null ? null : realName.getSubmitTime()));
        vo.setEducationStatus(status(education));
        vo.setEducationRejectReason(reason(education));
        vo.setEducationSubmitTime(formatTime(education == null ? null : education.getSubmitTime()));
        vo.setAvatarVerifyStatus(status(avatar));
        vo.setAvatarVerifyRejectReason(reason(avatar));
        vo.setAvatarVerifySubmitTime(formatTime(avatar == null ? null : avatar.getSubmitTime()));
        vo.setProfilePhotoAuditStatus(status(latestOf(userId, AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditTypeEnum.PROFILE_BG)));
        vo.setOpenTextAuditStatus(status(latestOf(userId, AppUserAuditTypeEnum.ABOUT_ME,
                AppUserAuditTypeEnum.HOPE_THEY_KNOW, AppUserAuditTypeEnum.PROFILE_QA)));
        int verifyLevel = auditService.certificationApprovedCount(userId);
        vo.setVerifyLevel(verifyLevel);
        vo.setUnlockMateRecommend(auditService.hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME));
        vo.setCoreAccessStatus(verifyLevel == 3 ? "CORE_ALLOWED" : "NON_CORE_ONLY");
        return vo;
    }

    private AppUserAuditRecord latestOf(Long userId, AppUserAuditTypeEnum... types) {
        AppUserAuditRecord latest = null;
        for (AppUserAuditTypeEnum type : types) {
            AppUserAuditRecord candidate = auditService.latestRecord(userId, type);
            if (candidate != null && (latest == null || after(candidate.getSubmitTime(), latest.getSubmitTime()))) {
                latest = candidate;
            }
        }
        return latest;
    }

    private boolean after(LocalDateTime left, LocalDateTime right) {
        if (left == null) return false;
        return right == null || left.isAfter(right);
    }

    private String status(AppUserAuditRecord record) {
        return record == null ? NOT_SUBMITTED : record.getStatus();
    }

    private String reason(AppUserAuditRecord record) {
        if (record == null) return null;
        return record.getRejectReason() != null ? record.getRejectReason() : record.getExpiredReason();
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? null : DISPLAY_TIME_FORMATTER.format(time);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (Exception e) {
            throw new BusinessException("生成哈希失败");
        }
    }

    private String json(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String educationMaterialJson(EducationSubmitReq req) {
        return "{\"studentStatus\":\"" + json(req.getStudentStatus())
                + "\",\"verificationCode\":\"" + json(req.getVerificationCode())
                + "\",\"diplomaNo\":\"" + json(req.getDiplomaNo())
                + "\",\"materialIds\":" + (req.getMaterialIds() == null ? "[]" : req.getMaterialIds()) + "}";
    }

    private String maskRealName(String name) {
        if (name == null || name.length() <= 1) return name;
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }

    private String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 8) return idCard;
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }
}
