package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.AvatarVerifyReq;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 用户认证服务实现
 * 首版 mock 第三方 API：
 * - 实名认证 → 提交即通过（后续接入微信人脸核身API）
 * - 学历认证 → 设为审核中（后续由学信网回调更新状态）
 * - 头像认证 → 提交即通过（后续接入第三方头像核验API）
 */
@Service
@RequiredArgsConstructor
public class VerificationServiceImpl implements VerificationService {

    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;

    /**
     * 查询当前用户的认证状态
     * @param userId 用户ID
     * @return 各认证项的状态、驳回原因、认证等级
     */
    @Override
    public VerificationStatusVO getStatus(Long userId) {
        return toStatusVO(requireVerification(userId));
    }

    /**
     * 提交实名认证
     * 校验身份证格式，mock 直接标记通过
     * @param userId 用户ID
     * @param req 真实姓名 + 身份证号
     * @return 提交后的认证状态
     */
    @Override
    @Transactional
    public VerificationStatusVO submitRealName(Long userId, RealNameSubmitReq req) {
        AppUserVerification verification = requireVerification(userId);
        if (req == null || !Boolean.TRUE.equals(req.getSinglePromise())) {
            throw new BusinessException("singlePromise 必须确认");
        }
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getRealNameStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("已完成实名认证，无需重复提交");
        }
        // 保存信息
        verification.setRealName(req.getRealName());
        verification.setIdCard(req.getIdCard());
        verification.setRealNameSubmitTime(LocalDateTime.now());
        // 当前使用模拟成功结果，后续接入微信人脸核身 API 后替换这里。
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setRealNameAuditSource(AuditSourceEnum.MACHINE.getCode());
        verification.setRealNameResultTime(LocalDateTime.now());
        verification.setRealNameRejectReason(null);
        // 更新认证等级
        verification.setVerifyLevel(calculateVerifyLevel(verification));
        verificationDao.updateById(verification);
        return toStatusVO(verification);
    }

    /**
     * 提交学历认证
     * 已通过或审核中拒绝重复提交；mock 设为 PENDING
     * @param userId 用户ID
     * @param req 认证方式（CHSI等）
     * @return 提交后的认证状态
     */
    @Override
    @Transactional
    public VerificationStatusVO submitEducation(Long userId, EducationSubmitReq req) {
        AppUserVerification verification = requireVerification(userId);
        if (!VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus())) {
            throw new BusinessException("请先完成实名认证");
        }
        if (req == null) {
            throw new BusinessException("学历认证参数不能为空");
        }
        if ("MATERIAL_UPLOAD".equals(req.getEducationMethod())
                && (req.getMaterialIds() == null || req.getMaterialIds().isEmpty())) {
            throw new BusinessException("学历材料不能为空");
        }
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getEducationStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("已完成学历认证，无需重复提交");
        }
        if (current == VerificationStatusEnum.PENDING) {
            throw new BusinessException("学历认证审核中，请耐心等待");
        }
        verification.setEducationMethod(req.getEducationMethod());
        verification.setEducationSubmitTime(LocalDateTime.now());
        // 当前提交后进入待审核，后续由真实学历 Provider 回调更新终态。
        verification.setEducationStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setEducationAuditSource(AuditSourceEnum.MACHINE.getCode());
        verification.setEducationRejectReason(null);
        verification.setVerifyLevel(calculateVerifyLevel(verification));
        verificationDao.updateById(verification);
        return toStatusVO(verification);
    }

    /**
     * 提交头像认证
     * 要求用户已上传头像，mock 直接标记通过
     * @param userId 用户ID
     * @return 提交后的认证状态
     */
    @Override
    @Transactional
    public VerificationStatusVO verifyAvatar(Long userId, AvatarVerifyReq req) {
        AppUser user = appUserDao.selectById(userId);
        boolean hasAvatarMedia = req != null && req.getMediaId() != null;
        if (user == null || (user.getAvatar() == null && !hasAvatarMedia)) {
            throw new BusinessException("请先上传头像");
        }
        AppUserVerification verification = requireVerification(userId);
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getAvatarVerifyStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("头像认证已通过");
        }
        verification.setAvatarVerifySubmitTime(LocalDateTime.now());
        // 当前使用模拟成功结果，后续接入第三方头像核验 API 后替换这里。
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setAvatarAuditSource(AuditSourceEnum.MACHINE.getCode());
        verification.setAvatarVerifyResultTime(LocalDateTime.now());
        verification.setAvatarVerifyRejectReason(null);
        verification.setVerifyLevel(calculateVerifyLevel(verification));
        verificationDao.updateById(verification);
        return toStatusVO(verification);
    }

    /** 根据三个认证项的通过数量计算认证等级 0-3 */
    private int calculateVerifyLevel(AppUserVerification verification) {
        int level = 0;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getEducationStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getAvatarVerifyStatus())) level++;
        return level;
    }

    /** 将认证记录转换为前端展示 VO */
    private VerificationStatusVO toStatusVO(AppUserVerification verification) {
        VerificationStatusVO vo = new VerificationStatusVO();
        vo.setRealNameStatus(verification.getRealNameStatus());
        vo.setRealNameRejectReason(verification.getRealNameRejectReason());
        vo.setRealNameSubmitTime(formatTime(verification.getRealNameSubmitTime()));
        vo.setEducationStatus(verification.getEducationStatus());
        vo.setEducationRejectReason(verification.getEducationRejectReason());
        vo.setEducationSubmitTime(formatTime(verification.getEducationSubmitTime()));
        vo.setAvatarVerifyStatus(verification.getAvatarVerifyStatus());
        vo.setAvatarVerifyRejectReason(verification.getAvatarVerifyRejectReason());
        vo.setAvatarVerifySubmitTime(formatTime(verification.getAvatarVerifySubmitTime()));
        vo.setProfilePhotoAuditStatus(verification.getProfilePhotoAuditStatus());
        vo.setOpenTextAuditStatus(verification.getOpenTextAuditStatus());
        vo.setVerifyLevel(verification.getVerifyLevel());
        vo.setUnlockMateRecommend(
                VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus()));
        vo.setCoreAccessStatus(coreAccessStatus(verification));
        return vo;
    }

    /** 格式化移动端展示时间，未提交时返回空。 */
    private String formatTime(LocalDateTime time) {
        return time == null ? null : DISPLAY_TIME_FORMATTER.format(time);
    }

    /** 三重认证全部通过才开放核心能力，否则只开放非核心能力。 */
    private String coreAccessStatus(AppUserVerification verification) {
        return calculateVerifyLevel(verification) == 3 ? "CORE_ALLOWED" : "NON_CORE_ONLY";
    }

    /** 查询用户认证记录，不存在抛异常 */
    private AppUserVerification requireVerification(Long userId) {
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>()
                        .eq(AppUserVerification::getUserId, userId));
        if (verification == null) {
            throw new BusinessException("用户认证记录不存在");
        }
        return verification;
    }
}
