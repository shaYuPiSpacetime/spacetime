package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 用户资料服务实现
 * 核心设计：
 * - 首登五步入门：基础信息、生日身高、关系目标、学历、地域资料逐步保存
 * - 性别提交后锁定不可修改（实名关联字段）
 * - 敏感字段修改（头像/关于我/希望TA了解）触发重新审核
 * - 准入状态由 firstLoginCompleted + 账号状态 + 实名、头像、学历三重认证共同决定
 */
@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final AppUserDao appUserDao;
    private final ProfileScoreConfig scoreConfig;
    private final AppUserAuditService auditService;

    /**
     * 查询首登初始化状态
     * 已完成 → currentStep=5, nextStep=null；未完成 → 根据已填字段推断当前步骤
     * @param userId 用户ID
     * @return 是否已完成 + 当前步骤 + 下一步 + 已保存字段
     */
    @Override
    public ProfileInitStatusVO getInitStatus(Long userId) {
        AppUser user = requireUser(userId);
        ProfileInitStatusVO vo = new ProfileInitStatusVO();
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        if (vo.getFirstLoginCompleted()) {
            vo.setCurrentStep(5);
            vo.setNextStep(null);
            vo.setCompletedSteps(completedSteps(5));
            vo.setNextAction("COMPLETED");
        } else {
            // 根据已填字段推断当前步骤，移动端可据此做断点续填。
            int step = inferStep(user);
            vo.setCurrentStep(step);
            vo.setNextStep(step);
            vo.setCompletedSteps(completedSteps(step - 1));
            vo.setNextAction(nextAction(step));
        }
        vo.setSavedFields(toDetailVO(user, false));
        return vo;
    }

    /**
     * 保存首登五步资料中的任一步
     * 校验性别不可修改、昵称长度2-12字符，更新字段后重新计算资料完整度
     * @param userId 用户ID
     * @param req 步骤号 + 当前步骤字段
     * @return 更新后的步骤状态
     */
    @Override
    @Transactional
    public ProfileInitStatusVO saveInit(Long userId, ProfileInitSaveReq req) {
        AppUser user = requireUser(userId);
        validateInitStep(req);
        validateMainlandRegion(req);
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
        vo.setNextStep(req.getStep() < 5 ? req.getStep() + 1 : null);
        vo.setCompletedSteps(completedSteps(req.getStep()));
        vo.setNextAction(nextAction(vo.getNextStep()));
        vo.setSavedFields(toDetailVO(user, false));
        return vo;
    }

    /**
     * 完成首登五步并标记首登完成
     * 校验昵称和性别必填，设置 firstLoginCompleted=1
     * @param userId 用户ID
     * @param req 最后一步字段
     * @return 完整资料详情
     */
    @Override
    @Transactional
    public ProfileDetailVO completeInit(Long userId, ProfileInitSaveReq req) {
        AppUser user = requireUser(userId);
        validateInitStep(req);
        validateMainlandRegion(req);
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
        return toDetailVO(user, true);
    }

    /**
     * 查看用户资料详情
     * @param userId 用户ID
     * @return 完整资料 + 准入状态
     */
    @Override
    public ProfileDetailVO getDetail(Long userId) {
        return toDetailVO(requireUser(userId), true);
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
        validateMainlandRegion(req);
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
        if (req.getWeight() != null) user.setWeight(req.getWeight());
        if (req.getIdentity() != null) user.setIdentity(req.getIdentity());
        if (req.getOccupation() != null) user.setOccupation(req.getOccupation());
        if (req.getAnnualIncome() != null) user.setAnnualIncome(req.getAnnualIncome());
        if (req.getLocationProvince() != null) user.setLocationProvince(req.getLocationProvince());
        if (req.getLocationCity() != null) user.setLocationCity(req.getLocationCity());
        if (req.getLocationDistrict() != null) user.setLocationDistrict(req.getLocationDistrict());
        if (req.getHometownProvince() != null) user.setHometownProvince(req.getHometownProvince());
        if (req.getHometownCity() != null) user.setHometownCity(req.getHometownCity());
        if (req.getHometownDistrict() != null) user.setHometownDistrict(req.getHometownDistrict());
        if (req.getSchool() != null) user.setSchool(req.getSchool());
        if (req.getMajor() != null) user.setMajor(req.getMajor());
        if (req.getEducationLevel() != null) user.setEducationLevel(req.getEducationLevel());
        if (req.getEmotionalStatus() != null) user.setEmotionalStatus(req.getEmotionalStatus());
        if (req.getDatingGoal() != null) user.setDatingGoal(req.getDatingGoal());
        if (req.getMaritalStatus() != null) user.setMaritalStatus(req.getMaritalStatus());
        if (req.getChildrenPlan() != null) user.setChildrenPlan(req.getChildrenPlan());
        if (req.getWantChild() != null) user.setWantChild(req.getWantChild());
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
            resetAvatarVerification(user);
        }
        // 开放性文字变更 → 重新触发文字审核
        if (textChanged) {
            resetTextModeration(user, req);
        }
        return toDetailVO(user, true);
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
        AccessStatusVO vo = new AccessStatusVO();
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            applyBlocked(vo, false, "请先完成资料初始化");
            return vo;
        }
        if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                || AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
            applyBlocked(vo, false, "账号状态异常");
            return vo;
        }
        boolean tripleApproved = auditService.certificationApprovedCount(userId) == 3;
        vo.setCanBrowseCards(true);
        vo.setCanCommunity(true);
        vo.setCanMatch(tripleApproved);
        vo.setCanMessage(tripleApproved);
        vo.setCanBeExposed(tripleApproved);
        vo.setCoreAccessStatus(tripleApproved ? "CORE_ALLOWED" : "NON_CORE_ONLY");
        vo.setBlockReason(tripleApproved ? null : "三重认证未全部通过");
        vo.setBlockReasons(tripleApproved ? List.of() : splitBlockReasons(vo.getBlockReason()));
        return vo;
    }

    /** 头像变更后新增一条头像待审核记录。 */
    private void resetAvatarVerification(AppUser user) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(user.getId());
        record.setAuditType(AppUserAuditTypeEnum.AVATAR.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setMediaUrl(user.getAvatar());
        record.setSubmitPayloadJson("{\"avatar\":\"" + json(user.getAvatar()) + "\"}");
        record.setMaskedPayloadJson(record.getSubmitPayloadJson());
        auditService.submit(record);
    }

    /** 开放文字变更后新增对应字段待审核记录。 */
    private void resetTextModeration(AppUser user, ProfileUpdateReq req) {
        if (req.getAboutMe() != null) {
            submitTextAudit(user.getId(), AppUserAuditTypeEnum.ABOUT_ME, req.getAboutMe());
        }
        if (req.getHopeTheyKnow() != null) {
            submitTextAudit(user.getId(), AppUserAuditTypeEnum.HOPE_THEY_KNOW, req.getHopeTheyKnow());
        }
    }

    private void submitTextAudit(Long userId, AppUserAuditTypeEnum type, String content) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(type.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setObjectKey(type.getCode());
        record.setContentText(content);
        record.setSubmitPayloadJson("{\"fieldName\":\"" + type.getCode() + "\",\"contentText\":\"" + json(content) + "\"}");
        record.setMaskedPayloadJson("{\"fieldName\":\"" + type.getCode() + "\",\"contentText\":\"" + json(StrUtil.maxLength(content, 24)) + "\"}");
        auditService.submit(record);
    }

    private void applyBlocked(AccessStatusVO vo, boolean canBrowse, String reason) {
        vo.setCanBrowseCards(canBrowse);
        vo.setCanCommunity(canBrowse);
        vo.setCanMatch(false);
        vo.setCanMessage(false);
        vo.setCanBeExposed(false);
        vo.setCoreAccessStatus("CORE_BLOCKED");
        vo.setBlockReason(reason);
        vo.setBlockReasons(List.of(reason));
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

    /** 首版仅支持中国大陆省市区；命中海外、国家、港澳台时直接拒绝且不写库。 */
    private void validateMainlandRegion(ProfileInitSaveReq req) {
        if (req == null) {
            return;
        }
        validateRegionValues(req.getLocationProvince(), req.getLocationCity(), req.getLocationDistrict(),
                req.getHometownProvince(), req.getHometownCity(), req.getHometownDistrict());
    }

    /** 首版仅支持中国大陆省市区；命中海外、国家、港澳台时直接拒绝且不写库。 */
    private void validateMainlandRegion(ProfileUpdateReq req) {
        if (req == null) {
            return;
        }
        validateRegionValues(req.getLocationProvince(), req.getLocationCity(), req.getLocationDistrict(),
                req.getHometownProvince(), req.getHometownCity(), req.getHometownDistrict());
    }

    /** 按接口文档错误码返回，便于移动端按 REGION_NOT_SUPPORTED 做统一提示。 */
    private void validateRegionValues(String... values) {
        for (String value : values) {
            if (isUnsupportedRegion(value)) {
                throw new BusinessException("REGION_NOT_SUPPORTED：首版仅支持中国大陆省市区");
            }
        }
    }

    /** 识别 UI 里可能传入的海外、国家、港澳台入口值。 */
    private boolean isUnsupportedRegion(String value) {
        if (StrUtil.isBlank(value)) {
            return false;
        }
        String raw = value.trim();
        String upper = raw.toUpperCase(Locale.ROOT);
        return upper.contains("OVERSEAS")
                || upper.contains("FOREIGN")
                || upper.equals("US")
                || upper.equals("USA")
                || upper.equals("UNITED STATES")
                || raw.contains("海外")
                || raw.contains("国外")
                || raw.contains("国家")
                || raw.contains("港澳台")
                || raw.contains("香港")
                || raw.contains("澳门")
                || raw.contains("台湾");
    }

    /** 校验首登步骤号，当前移动端固定五步。 */
    private void validateInitStep(ProfileInitSaveReq req) {
        if (req == null || req.getStep() == null || req.getStep() < 1 || req.getStep() > 5) {
            throw new BusinessException("首登步骤必须在1-5之间");
        }
    }

    /** 根据已填字段推断当前首登步骤。 */
    private int inferStep(AppUser user) {
        if (StrUtil.isBlank(user.getGender())) return 1;
        if (user.getBirthday() == null || user.getHeight() == null) return 2;
        if (StrUtil.isBlank(user.getIdentity()) || StrUtil.isBlank(user.getDatingGoal()) || StrUtil.isBlank(user.getEmotionalStatus())) return 3;
        if (StrUtil.isBlank(user.getEducationLevel())) return 4;
        if (StrUtil.isBlank(user.getLocationProvince()) || StrUtil.isBlank(user.getLocationCity())) return 5;
        return 5;
    }

    /** 生成已完成步骤列表，移动端用于恢复进度条。 */
    private List<Integer> completedSteps(int maxStep) {
        List<Integer> steps = new ArrayList<>();
        for (int i = 1; i <= Math.min(maxStep, 5); i++) {
            steps.add(i);
        }
        return steps;
    }

    /** 生成下一步动作编码，完成时返回 COMPLETED。 */
    private String nextAction(Integer nextStep) {
        return nextStep == null ? "COMPLETED" : "CONTINUE_STEP_" + nextStep;
    }

    /** 将中文阻断原因拆成数组，兼容移动端逐项展示。 */
    private List<String> splitBlockReasons(String blockReason) {
        if (StrUtil.isBlank(blockReason)) {
            return List.of();
        }
        return List.of(blockReason);
    }

    /** 将请求中的非空字段应用到用户实体 */
    private void applyStepFields(AppUser user, ProfileInitSaveReq req) {
        if (StrUtil.isNotBlank(req.getNickname())) user.setNickname(req.getNickname());
        if (StrUtil.isNotBlank(req.getGender())) user.setGender(req.getGender());
        if (StrUtil.isNotBlank(req.getBirthday())) user.setBirthday(LocalDate.parse(req.getBirthday()));
        if (req.getHeight() != null) user.setHeight(req.getHeight());
        if (req.getWeight() != null) user.setWeight(req.getWeight());
        if (StrUtil.isNotBlank(req.getIdentity())) user.setIdentity(req.getIdentity());
        if (StrUtil.isNotBlank(req.getOccupation())) user.setOccupation(req.getOccupation());
        if (StrUtil.isNotBlank(req.getAnnualIncome())) user.setAnnualIncome(req.getAnnualIncome());
        if (StrUtil.isNotBlank(req.getLocationProvince())) user.setLocationProvince(req.getLocationProvince());
        if (StrUtil.isNotBlank(req.getLocationCity())) user.setLocationCity(req.getLocationCity());
        if (StrUtil.isNotBlank(req.getLocationDistrict())) user.setLocationDistrict(req.getLocationDistrict());
        if (StrUtil.isNotBlank(req.getHometownProvince())) user.setHometownProvince(req.getHometownProvince());
        if (StrUtil.isNotBlank(req.getHometownCity())) user.setHometownCity(req.getHometownCity());
        if (StrUtil.isNotBlank(req.getHometownDistrict())) user.setHometownDistrict(req.getHometownDistrict());
        if (StrUtil.isNotBlank(req.getSchool())) user.setSchool(req.getSchool());
        if (StrUtil.isNotBlank(req.getMajor())) user.setMajor(req.getMajor());
        if (StrUtil.isNotBlank(req.getEducationLevel())) user.setEducationLevel(req.getEducationLevel());
        if (StrUtil.isNotBlank(req.getEmotionalStatus())) user.setEmotionalStatus(req.getEmotionalStatus());
        if (StrUtil.isNotBlank(req.getDatingGoal())) user.setDatingGoal(req.getDatingGoal());
        if (StrUtil.isNotBlank(req.getMaritalStatus())) user.setMaritalStatus(req.getMaritalStatus());
        if (StrUtil.isNotBlank(req.getChildrenPlan())) user.setChildrenPlan(req.getChildrenPlan());
        if (StrUtil.isNotBlank(req.getWantChild())) user.setWantChild(req.getWantChild());
        if (StrUtil.isNotBlank(req.getAvatar())) user.setAvatar(req.getAvatar());
        if (StrUtil.isNotBlank(req.getAboutMe())) {
            validateAboutMe(req.getAboutMe());
            user.setAboutMe(req.getAboutMe());
        }
        if (StrUtil.isNotBlank(req.getHopeTheyKnow())) user.setHopeTheyKnow(req.getHopeTheyKnow());
    }

    /** 将实体转换为资料详情 VO */
    private ProfileDetailVO toDetailVO(AppUser user, boolean includeAccessStatus) {
        ProfileDetailVO vo = new ProfileDetailVO();
        vo.setUserId(user.getId());
        vo.setAvatar(user.getAvatar());
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentity(user.getIdentity());
        vo.setOccupation(user.getOccupation());
        vo.setAnnualIncome(user.getAnnualIncome());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setLocationDistrict(user.getLocationDistrict());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setHometownDistrict(user.getHometownDistrict());
        vo.setSchool(user.getSchool());
        vo.setMajor(user.getMajor());
        vo.setEducationLevel(user.getEducationLevel());
        vo.setEmotionalStatus(user.getEmotionalStatus());
        vo.setDatingGoal(user.getDatingGoal());
        vo.setMaritalStatus(user.getMaritalStatus());
        vo.setChildrenPlan(user.getChildrenPlan());
        vo.setWantChild(user.getWantChild());
        vo.setAboutMe(user.getAboutMe());
        vo.setHopeTheyKnow(user.getHopeTheyKnow());
        vo.setVoiceIntroUrl(user.getVoiceIntroUrl());
        vo.setVoiceIntroDuration(user.getVoiceIntroDuration());
        vo.setVoiceIntroAuditStatus(user.getVoiceIntroAuditStatus());
        vo.setVoiceIntroRejectReason(user.getVoiceIntroRejectReason());
        vo.setTags(user.getTags());
        vo.setPhotos(user.getPhotos());
        vo.setProfileBgImage(user.getProfileBgImage());
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(user.getProfileScore());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        if (includeAccessStatus) {
            vo.setAccessStatus(getAccessStatus(user.getId()));
        }
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

    private String json(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
