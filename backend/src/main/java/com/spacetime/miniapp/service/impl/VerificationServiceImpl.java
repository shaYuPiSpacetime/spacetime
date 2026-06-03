package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getRealNameStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("已完成实名认证，无需重复提交");
        }
        // 保存信息
        verification.setRealName(req.getRealName());
        verification.setIdCard(req.getIdCard());
        verification.setRealNameSubmitTime(LocalDateTime.now());
        // Mock: 直接标记通过（后续接入微信人脸核身API）
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
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
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getEducationStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("已完成学历认证，无需重复提交");
        }
        if (current == VerificationStatusEnum.PENDING) {
            throw new BusinessException("学历认证审核中，请耐心等待");
        }
        verification.setEducationMethod(req.getEducationMethod());
        verification.setEducationSubmitTime(LocalDateTime.now());
        // Mock: 设置为审核中（后续改为 PENDING，由第三方回调更新为 APPROVED/REJECTED）
        verification.setEducationStatus(VerificationStatusEnum.PENDING.getCode());
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
    public VerificationStatusVO verifyAvatar(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || user.getAvatar() == null) {
            throw new BusinessException("请先上传头像");
        }
        AppUserVerification verification = requireVerification(userId);
        VerificationStatusEnum current = VerificationStatusEnum.getByCode(verification.getAvatarVerifyStatus());
        if (current == VerificationStatusEnum.APPROVED) {
            throw new BusinessException("头像认证已通过");
        }
        verification.setAvatarVerifySubmitTime(LocalDateTime.now());
        // Mock: 直接标记通过（后续接入第三方头像核验API）
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
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
        vo.setEducationStatus(verification.getEducationStatus());
        vo.setEducationRejectReason(verification.getEducationRejectReason());
        vo.setAvatarVerifyStatus(verification.getAvatarVerifyStatus());
        vo.setAvatarVerifyRejectReason(verification.getAvatarVerifyRejectReason());
        vo.setProfilePhotoAuditStatus(verification.getProfilePhotoAuditStatus());
        vo.setOpenTextAuditStatus(verification.getOpenTextAuditStatus());
        vo.setVerifyLevel(verification.getVerifyLevel());
        vo.setUnlockMateRecommend(
                VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus()));
        return vo;
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
