package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.ProfileInitSaveReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 用户资料服务实现
 * 核心设计：
 * - 首登三步入门：step1基础信息 → step2教育/感情信息 → step3自我介绍完成
 * - 性别提交后锁定不可修改（实名关联字段）
 * - 敏感字段修改（头像/关于我/希望TA了解）触发重新审核
 * - 准入状态由 firstLoginCompleted + 账号状态 + 实名认证状态 共同决定
 */
@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;
    private final ProfileScoreConfig scoreConfig;

    /**
     * 查询首登初始化状态
     * 已完成 → currentStep=3, nextStep=null；未完成 → 根据已填字段推断当前步骤
     * @param userId 用户ID
     * @return 是否已完成 + 当前步骤 + 下一步 + 已保存字段
     */
    @Override
    public ProfileInitStatusVO getInitStatus(Long userId) {
        AppUser user = requireUser(userId);
        ProfileInitStatusVO vo = new ProfileInitStatusVO();
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        if (vo.getFirstLoginCompleted()) {
            vo.setCurrentStep(3);
            vo.setNextStep(null);
        } else {
            // 根据已填字段推断当前步骤
            int step = inferStep(user);
            vo.setCurrentStep(step);
            vo.setNextStep(step < 3 ? step + 1 : null);
        }
        vo.setSavedFields(toDetailVO(user));
        return vo;
    }

    /**
     * 保存第1步或第2步资料
     * 校验性别不可修改、昵称长度2-12字符，更新字段后重新计算资料完整度
     * @param userId 用户ID
     * @param req 步骤号 + 当前步骤字段
     * @return 更新后的步骤状态
     */
    @Override
    @Transactional
    public ProfileInitStatusVO saveInit(Long userId, ProfileInitSaveReq req) {
        AppUser user = requireUser(userId);
        if (user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1) {
            throw new BusinessException("首登资料已完成，请使用资料编辑接口");
        }
        // 性别一旦提交不可修改
        if (StrUtil.isNotBlank(req.getGender()) && StrUtil.isNotBlank(user.getGender())
                && !user.getGender().equals(req.getGender())) {
            throw new BusinessException("性别提交后不可修改");
        }
        // 校验昵称
        if (StrUtil.isNotBlank(req.getNickname())) {
            validateNickname(req.getNickname());
        }
        // 更新对应步骤的字段
        applyStepFields(user, req);
        // 计算年龄和星座
        if (user.getBirthday() != null) {
            user.setAge(scoreConfig.calculateAge(user.getBirthday()));
            user.setZodiac(scoreConfig.calculateZodiac(user.getBirthday()));
        }
        // 计算资料完整度
        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);

        ProfileInitStatusVO vo = new ProfileInitStatusVO();
        vo.setFirstLoginCompleted(false);
        vo.setCurrentStep(req.getStep());
        vo.setNextStep(req.getStep() < 3 ? req.getStep() + 1 : null);
        vo.setSavedFields(toDetailVO(user));
        return vo;
    }

    /**
     * 完成第3步并标记首登完成
     * 校验昵称和性别必填，设置 firstLoginCompleted=1
     * @param userId 用户ID
     * @param req 最后一步字段
     * @return 完整资料详情
     */
    @Override
    @Transactional
    public ProfileDetailVO completeInit(Long userId, ProfileInitSaveReq req) {
        AppUser user = requireUser(userId);
        if (user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1) {
            throw new BusinessException("首登资料已完成");
        }
        // 校验必填字段
        if (StrUtil.isBlank(req.getNickname()) && StrUtil.isBlank(user.getNickname())) {
            throw new BusinessException("昵称不能为空");
        }
        if (StrUtil.isBlank(req.getGender()) && StrUtil.isBlank(user.getGender())) {
            throw new BusinessException("性别不能为空");
        }
        // 应用最后一步字段
        applyStepFields(user, req);
        // 标记完成
        user.setFirstLoginCompleted(1);
        if (user.getBirthday() != null) {
            user.setAge(scoreConfig.calculateAge(user.getBirthday()));
            user.setZodiac(scoreConfig.calculateZodiac(user.getBirthday()));
        }
        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);
        return toDetailVO(user);
    }

    /**
     * 查看用户资料详情
     * @param userId 用户ID
     * @return 完整资料 + 准入状态
     */
    @Override
    public ProfileDetailVO getDetail(Long userId) {
        return toDetailVO(requireUser(userId));
    }

    /**
     * 增量更新资料（PATCH 语义）
     * null 字段不更新；头像变更重置头像认证，文字变更重置文字审核
     * @param userId 用户ID
     * @param req 需要更新的字段
     * @return 更新后的完整资料
     */
    @Override
    @Transactional
    public ProfileDetailVO updateProfile(Long userId, ProfileUpdateReq req) {
        AppUser user = requireUser(userId);
        boolean avatarChanged = false;
        boolean textChanged = false;
        // 增量更新：只更新非 null 字段
        if (StrUtil.isNotBlank(req.getNickname())) {
            validateNickname(req.getNickname());
            user.setNickname(req.getNickname());
        }
        if (req.getAvatar() != null) {
            if (!req.getAvatar().equals(user.getAvatar())) {
                avatarChanged = true;
            }
            user.setAvatar(req.getAvatar());
        }
        if (req.getBirthday() != null) {
            user.setBirthday(LocalDate.parse(req.getBirthday()));
            user.setAge(scoreConfig.calculateAge(user.getBirthday()));
            user.setZodiac(scoreConfig.calculateZodiac(user.getBirthday()));
        }
        if (req.getHeight() != null) user.setHeight(req.getHeight());
        if (req.getLocationProvince() != null) user.setLocationProvince(req.getLocationProvince());
        if (req.getLocationCity() != null) user.setLocationCity(req.getLocationCity());
        if (req.getLocationDistrict() != null) user.setLocationDistrict(req.getLocationDistrict());
        if (req.getHometownProvince() != null) user.setHometownProvince(req.getHometownProvince());
        if (req.getHometownCity() != null) user.setHometownCity(req.getHometownCity());
        if (req.getSchool() != null) user.setSchool(req.getSchool());
        if (req.getMajor() != null) user.setMajor(req.getMajor());
        if (req.getEducationLevel() != null) user.setEducationLevel(req.getEducationLevel());
        if (req.getEmotionalStatus() != null) user.setEmotionalStatus(req.getEmotionalStatus());
        if (req.getDatingGoal() != null) user.setDatingGoal(req.getDatingGoal());
        if (req.getMaritalStatus() != null) user.setMaritalStatus(req.getMaritalStatus());
        if (req.getAboutMe() != null) {
            if (!req.getAboutMe().equals(user.getAboutMe())) textChanged = true;
            validateAboutMe(req.getAboutMe());
            user.setAboutMe(req.getAboutMe());
        }
        if (req.getHopeTheyKnow() != null) {
            if (!req.getHopeTheyKnow().equals(user.getHopeTheyKnow())) textChanged = true;
            user.setHopeTheyKnow(req.getHopeTheyKnow());
        }
        if (req.getVoiceIntroUrl() != null) user.setVoiceIntroUrl(req.getVoiceIntroUrl());
        if (req.getVoiceIntroDuration() != null) user.setVoiceIntroDuration(req.getVoiceIntroDuration());
        if (req.getMbtiType() != null) user.setMbtiType(req.getMbtiType());
        if (req.getProfileBgImage() != null) user.setProfileBgImage(req.getProfileBgImage());

        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);

        // 头像变更 → 重新触发头像认证
        if (avatarChanged) {
            resetAvatarVerification(userId);
        }
        // 开放性文字变更 → 重新触发文字审核
        if (textChanged) {
            resetTextModeration(userId);
        }
        return toDetailVO(user);
    }

    /**
     * 查询用户准入状态
     * 准入规则：1.未首登→全禁 2.账号异常→全禁 3.已首登→可浏览 4.实名通过→可匹配+可曝光
     * @param userId 用户ID
     * @return 三种能力的开关 + 阻断原因
     */
    @Override
    public AccessStatusVO getAccessStatus(Long userId) {
        AppUser user = requireUser(userId);
        AppUserVerification verification = requireVerification(userId);
        AccessStatusVO vo = new AccessStatusVO();
        // 1. 未完成首登资料
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() == 0) {
            vo.setCanBrowseCards(false);
            vo.setCanMatch(false);
            vo.setCanBeExposed(false);
            vo.setBlockReason("请先完成资料初始化");
            return vo;
        }
        // 2. 账号状态检查
        if (!AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())) {
            vo.setCanBrowseCards(false);
            vo.setCanMatch(false);
            vo.setCanBeExposed(false);
            vo.setBlockReason("账号状态异常");
            return vo;
        }
        // 3. 至少可浏览
        vo.setCanBrowseCards(true);
        // 4. 实名认证通过 → 开放完整能力
        boolean realNamePassed = VerificationStatusEnum.APPROVED.getCode()
                .equals(verification.getRealNameStatus());
        vo.setCanMatch(realNamePassed);
        vo.setCanBeExposed(realNamePassed);
        if (!realNamePassed) {
            vo.setBlockReason("完成实名认证后，才可曝光和匹配");
        }
        return vo;
    }

    /** 头像变更后重置头像认证为 PENDING */
    private void resetAvatarVerification(Long userId) {
        AppUserVerification verification = requireVerification(userId);
        verification.setAvatarVerifyStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setAvatarVerifySubmitTime(java.time.LocalDateTime.now());
        verification.setAvatarVerifyRejectReason(null);
        verificationDao.updateById(verification);
    }

    /** 文字变更后重置文字审核为 PENDING */
    private void resetTextModeration(Long userId) {
        AppUserVerification verification = requireVerification(userId);
        verification.setOpenTextAuditStatus("PENDING");
        verification.setOpenTextSubmitTime(java.time.LocalDateTime.now());
        verification.setOpenTextRejectReason(null);
        verificationDao.updateById(verification);
    }

    /** 校验昵称长度 2-12 字符 */
    private void validateNickname(String nickname) {
        if (nickname.length() < 2 || nickname.length() > 12) {
            throw new BusinessException("昵称需2-12个字符");
        }
    }

    /** 校验关于我长度 20-300 字 */
    private void validateAboutMe(String aboutMe) {
        if (StrUtil.isNotBlank(aboutMe) && (aboutMe.length() < 20 || aboutMe.length() > 300)) {
            throw new BusinessException("关于我需20-300个字");
        }
    }

    /** 根据已填字段推断当前首登步骤 */
    private int inferStep(AppUser user) {
        boolean hasBasic = StrUtil.isNotBlank(user.getNickname())
                || StrUtil.isNotBlank(user.getGender())
                || user.getBirthday() != null
                || user.getHeight() != null;
        boolean hasSchool = StrUtil.isNotBlank(user.getSchool())
                || StrUtil.isNotBlank(user.getEducationLevel())
                || StrUtil.isNotBlank(user.getDatingGoal());
        if (hasSchool) return 2;
        if (hasBasic) return 1;
        return 1;
    }

    /** 将请求中的非空字段应用到用户实体 */
    private void applyStepFields(AppUser user, ProfileInitSaveReq req) {
        if (StrUtil.isNotBlank(req.getNickname())) user.setNickname(req.getNickname());
        if (StrUtil.isNotBlank(req.getGender())) user.setGender(req.getGender());
        if (StrUtil.isNotBlank(req.getBirthday())) user.setBirthday(LocalDate.parse(req.getBirthday()));
        if (req.getHeight() != null) user.setHeight(req.getHeight());
        if (StrUtil.isNotBlank(req.getLocationProvince())) user.setLocationProvince(req.getLocationProvince());
        if (StrUtil.isNotBlank(req.getLocationCity())) user.setLocationCity(req.getLocationCity());
        if (StrUtil.isNotBlank(req.getLocationDistrict())) user.setLocationDistrict(req.getLocationDistrict());
        if (StrUtil.isNotBlank(req.getHometownProvince())) user.setHometownProvince(req.getHometownProvince());
        if (StrUtil.isNotBlank(req.getHometownCity())) user.setHometownCity(req.getHometownCity());
        if (StrUtil.isNotBlank(req.getSchool())) user.setSchool(req.getSchool());
        if (StrUtil.isNotBlank(req.getMajor())) user.setMajor(req.getMajor());
        if (StrUtil.isNotBlank(req.getEducationLevel())) user.setEducationLevel(req.getEducationLevel());
        if (StrUtil.isNotBlank(req.getEmotionalStatus())) user.setEmotionalStatus(req.getEmotionalStatus());
        if (StrUtil.isNotBlank(req.getDatingGoal())) user.setDatingGoal(req.getDatingGoal());
        if (StrUtil.isNotBlank(req.getMaritalStatus())) user.setMaritalStatus(req.getMaritalStatus());
        if (StrUtil.isNotBlank(req.getAvatar())) user.setAvatar(req.getAvatar());
        if (StrUtil.isNotBlank(req.getAboutMe())) {
            validateAboutMe(req.getAboutMe());
            user.setAboutMe(req.getAboutMe());
        }
        if (StrUtil.isNotBlank(req.getHopeTheyKnow())) user.setHopeTheyKnow(req.getHopeTheyKnow());
    }

    /** 将实体转换为资料详情 VO */
    private ProfileDetailVO toDetailVO(AppUser user) {
        ProfileDetailVO vo = new ProfileDetailVO();
        vo.setUserId(user.getId());
        vo.setAvatar(user.getAvatar());
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setLocationDistrict(user.getLocationDistrict());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setSchool(user.getSchool());
        vo.setMajor(user.getMajor());
        vo.setEducationLevel(user.getEducationLevel());
        vo.setEmotionalStatus(user.getEmotionalStatus());
        vo.setDatingGoal(user.getDatingGoal());
        vo.setMaritalStatus(user.getMaritalStatus());
        vo.setAboutMe(user.getAboutMe());
        vo.setHopeTheyKnow(user.getHopeTheyKnow());
        vo.setVoiceIntroUrl(user.getVoiceIntroUrl());
        vo.setVoiceIntroDuration(user.getVoiceIntroDuration());
        vo.setTags(user.getTags());
        vo.setPhotos(user.getPhotos());
        vo.setProfileBgImage(user.getProfileBgImage());
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(user.getProfileScore());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        vo.setAccessStatus(getAccessStatus(user.getId()));
        return vo;
    }

    /** 查询用户，不存在抛异常 */
    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    /** 查询用户认证记录，不存在抛异常 */
    private AppUserVerification requireVerification(Long userId) {
        AppUserVerification verification = verificationDao.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<AppUserVerification>()
                        .eq(AppUserVerification::getUserId, userId));
        if (verification == null) {
            throw new BusinessException("用户认证记录不存在");
        }
        return verification;
    }
}
