package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.miniapp.dto.request.BasicProfileSaveReq;
import com.spacetime.miniapp.dto.request.ProfileInitStepReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.BasicProfileFieldVO;
import com.spacetime.miniapp.dto.response.BasicProfileVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * 用户资料服务实现
 * 核心设计：
 * - 首登五步入门：性别、年龄、身份、学历、地址逐步保存
 * - 性别可在基础资料页修改，并统一保存为 MALE/FEMALE
 * - 敏感字段修改（头像/关于我/希望TA了解）触发重新审核
 * - 准入状态由 firstLoginCompleted + 账号状态 + 实名、头像、学历三重认证共同决定
 */
@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final AppUserDao appUserDao;
    private final ProfileScoreConfig scoreConfig;
    private final AppUserAuditService auditService;
    private final AppUserAuditContentService auditContentService;
    private final Prd01FieldConfigResolver fieldConfigResolver;
    private final ProfileDictionaryService profileDictionaryService;
    private final ObjectMapper objectMapper;

    /**
     * 查询首登初始化状态
     * 已完成时 nextStep 为空；未完成时以后端持久化进度为准。
     * @param userId 用户ID
     * @return 是否已完成 + 当前步骤 + 下一步 + 已保存字段
     */
    @Override
    public ProfileInitStatusVO getInitStatus(Long userId) {
        AppUser user = requireUser(userId);
        ProfileInitStatusVO vo = new ProfileInitStatusVO();
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        if (vo.getFirstLoginCompleted()) {
            vo.setCurrentStep(fieldConfigResolver.lastVisibleStep());
            vo.setNextStep(null);
            vo.setCompletedSteps(fieldConfigResolver.completedVisibleSteps(null));
            vo.setNextAction("COMPLETED");
        } else {
            Integer step = resolvePersistedNextStep(user);
            vo.setCurrentStep(step);
            vo.setNextStep(step);
            vo.setCompletedSteps(fieldConfigResolver.completedVisibleSteps(step));
            vo.setNextAction(nextAction(step));
        }
        vo.setSavedFields(toDetailVO(user, false));
        return vo;
    }

    /**
     * 保存首登五步资料中的任一步
     * 保存成功后由后端返回下一个可见步骤；最后一个可见步骤保存成功后自动完成首登。
     * @param userId 用户ID
     * @param req 步骤号 + 当前步骤字段
     * @return 更新后的步骤状态
     */
    @Override
    @Transactional
    public ProfileInitStatusVO saveInitStep(Long userId, ProfileInitStepReq req) {
        AppUser user = requireUser(userId);
        validateInitStep(req);
        validateMainlandRegion(req);
        if (user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1) {
            throw new BusinessException("首登资料已完成，请使用资料编辑接口");
        }
        Integer currentStep = resolvePersistedNextStep(user);
        fieldConfigResolver.validateVisibleStep(req.getStep());
        if (currentStep != null && req.getStep() > currentStep) {
            throw new BusinessException("当前应填写第" + currentStep + "步，不能越级提交第" + req.getStep() + "步");
        }
        validateStepPayload(req);

        // 性别首次提交后锁定，后续资料修改接口也不能绕过该规则。
        if (StrUtil.isNotBlank(req.getGender()) && StrUtil.isNotBlank(user.getGender())
                && !user.getGender().equals(req.getGender())) {
            throw new BusinessException("性别提交后不可修改");
        }
        applyStepFields(user, req);
        fieldConfigResolver.validateRequiredStepFields(user, req.getStep());

        // 编辑已完成步骤时不回退进度；只有提交当前步骤才向后推进。
        Integer nextStep = currentStep;
        boolean completed = false;
        if (currentStep != null && req.getStep().equals(currentStep)) {
            nextStep = fieldConfigResolver.nextVisibleStep(req.getStep() + 1);
            if (nextStep == null) {
                fieldConfigResolver.validateRequiredInitFields(user);
                user.setFirstLoginCompleted(1);
                completed = true;
            }
            user.setFirstLoginNextStep(nextStep);
        }

        // 计算年龄和星座
        if (user.getBirthday() != null) {
            user.setAge(scoreConfig.calculateAge(user.getBirthday()));
            user.setZodiac(scoreConfig.calculateZodiac(user.getBirthday()));
        }
        // 计算资料完整度
        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);

        ProfileInitStatusVO vo = new ProfileInitStatusVO();
        vo.setFirstLoginCompleted(completed);
        vo.setCurrentStep(completed ? req.getStep() : nextStep);
        vo.setNextStep(nextStep);
        vo.setCompletedSteps(fieldConfigResolver.completedVisibleSteps(nextStep));
        vo.setNextAction(nextAction(nextStep));
        vo.setSavedFields(toDetailVO(user, false));
        return vo;
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

    /** 查询基础资料页反显值、年龄范围、缺失必填项和字段配置。 */
    @Override
    public BasicProfileVO getBasicProfile(Long userId) {
        AppUser user = requireUser(userId);
        List<BasicProfileFieldVO> settings = fieldConfigResolver.basicFieldsForMobile();
        return toBasicProfileVO(user, settings);
    }

    /**
     * 保存基础资料页全部已展示字段。
     * 隐藏字段不改写；性别不在请求中；动态必填校验失败时不执行数据库更新。
     */
    @Override
    @Transactional
    public BasicProfileVO saveBasicProfile(Long userId, BasicProfileSaveReq req) {
        if (req == null) {
            throw new BusinessException("基础资料不能为空");
        }
        AppUser user = requireUser(userId);
        List<BasicProfileFieldVO> settings = fieldConfigResolver.basicFieldsForMobile();
        validateMainlandRegion(req);
        applyBasicProfileFields(user, req, settings);
        fieldConfigResolver.validateRequiredBasicFields(user, settings);

        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);
        return toBasicProfileVO(user, settings);
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
        // 增量更新：只更新非 null 字段
        if (StrUtil.isNotBlank(req.getNickname())) {
            validateNickname(req.getNickname());
            user.setNickname(req.getNickname());
        }
        if (req.getBirthday() != null) {
            user.setBirthday(LocalDate.parse(req.getBirthday()));
            user.setAge(scoreConfig.calculateAge(user.getBirthday()));
            user.setZodiac(scoreConfig.calculateZodiac(user.getBirthday()));
        }
        if (req.getHeight() != null) user.setHeight(req.getHeight());
        if (req.getWeight() != null) user.setWeight(req.getWeight());
        if (req.getIdentity() != null) {
            user.setIdentity(profileDictionaryService.requireCode(
                    ProfileDictType.IDENTITY, req.getIdentity(), "身份"));
        }
        if (req.getOccupation() != null) {
            user.setOccupation(profileDictionaryService.requireCode(
                    ProfileDictType.OCCUPATION, req.getOccupation(), "职业"));
        }
        if (req.getAnnualIncome() != null) {
            user.setAnnualIncome(profileDictionaryService.requireCode(
                    ProfileDictType.ANNUAL_INCOME, req.getAnnualIncome(), "年收入"));
        }
        if (req.getLocationProvince() != null) user.setLocationProvince(req.getLocationProvince());
        if (req.getLocationCity() != null) user.setLocationCity(req.getLocationCity());
        if (req.getLocationDistrict() != null) user.setLocationDistrict(req.getLocationDistrict());
        if (req.getHometownProvince() != null) user.setHometownProvince(req.getHometownProvince());
        if (req.getHometownCity() != null) user.setHometownCity(req.getHometownCity());
        if (req.getHometownDistrict() != null) user.setHometownDistrict(req.getHometownDistrict());
        if (req.getSchool() != null) user.setSchool(req.getSchool());
        if (req.getMajor() != null) user.setMajor(req.getMajor());
        if (req.getEducationLevel() != null) {
            user.setEducationLevel(profileDictionaryService.requireCode(
                    ProfileDictType.EDUCATION_LEVEL, req.getEducationLevel(), "学历"));
        }
        if (req.getEmotionalStatus() != null) user.setEmotionalStatus(req.getEmotionalStatus());
        if (req.getDatingGoal() != null) user.setDatingGoal(req.getDatingGoal());
        if (req.getMaritalStatus() != null) {
            user.setMaritalStatus(profileDictionaryService.requireCode(
                    ProfileDictType.MARITAL_STATUS, req.getMaritalStatus(), "婚姻状况"));
        }
        if (req.getChildrenPlan() != null) user.setChildrenPlan(req.getChildrenPlan());
        if (req.getWantChild() != null) user.setWantChild(req.getWantChild());
        if (req.getMbtiType() != null) user.setMbtiType(req.getMbtiType());

        user.setProfileScore(scoreConfig.calculate(user));
        appUserDao.updateById(user);

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
        vo.setBlockReasons(tripleApproved ? List.of() : List.of("三重认证未全部通过"));
        return vo;
    }

    private void applyBlocked(AccessStatusVO vo, boolean canBrowse, String reason) {
        vo.setCanBrowseCards(canBrowse);
        vo.setCanCommunity(canBrowse);
        vo.setCanMatch(false);
        vo.setCanMessage(false);
        vo.setCanBeExposed(false);
        vo.setCoreAccessStatus("CORE_BLOCKED");
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
    private void validateMainlandRegion(ProfileInitStepReq req) {
        if (req == null) {
            return;
        }
        validateRegionValues(req.getLocationProvince(), req.getLocationCity(), req.getLocationDistrict(),
                null, null, null);
    }

    /** 首版仅支持中国大陆省市区；命中海外、国家、港澳台时直接拒绝且不写库。 */
    private void validateMainlandRegion(ProfileUpdateReq req) {
        if (req == null) {
            return;
        }
        validateRegionValues(req.getLocationProvince(), req.getLocationCity(), req.getLocationDistrict(),
                req.getHometownProvince(), req.getHometownCity(), req.getHometownDistrict());
    }

    /** 基础资料页的现居地和家乡都只允许中国大陆地区。 */
    private void validateMainlandRegion(BasicProfileSaveReq req) {
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

    /** 按当前字段展示配置应用完整表单值。 */
    private void applyBasicProfileFields(
            AppUser user,
            BasicProfileSaveReq req,
            List<BasicProfileFieldVO> settings) {
        if (visible(settings, "nickname")) {
            String nickname = trimToNull(req.getNickname());
            if (nickname != null) validateNickname(nickname);
            user.setNickname(nickname);
        }
        if (visible(settings, "gender")) {
            user.setGender(genderCodeOrNull(req.getGender()));
        }
        if (visible(settings, "birthday")) {
            LocalDate birthday = parseBirthday(req.getBirthday());
            validateAllowedAge(birthday);
            user.setBirthday(birthday);
            user.setAge(scoreConfig.calculateAge(birthday));
            user.setZodiac(scoreConfig.calculateZodiac(birthday));
        }
        if (visible(settings, "height")) {
            validateRange(req.getHeight(), 140, 220, "身高需在140-220cm之间");
            user.setHeight(req.getHeight());
        }
        if (visible(settings, "weight")) {
            validateRange(req.getWeight(), 30, 200, "体重需在30-200kg之间");
            user.setWeight(req.getWeight());
        }
        if (visible(settings, "identity")) {
            user.setIdentity(dictionaryCodeOrNull(ProfileDictType.IDENTITY, req.getIdentity(), "身份"));
        }
        if (visible(settings, "educationLevel")) {
            user.setEducationLevel(dictionaryCodeOrNull(
                    ProfileDictType.EDUCATION_LEVEL, req.getEducationLevel(), "学历"));
        }
        if (visible(settings, "industry")) {
            user.setIndustry(dictionaryCodeOrNull(ProfileDictType.INDUSTRY, req.getIndustry(), "行业"));
        }
        if (visible(settings, "occupation")) {
            user.setOccupation(dictionaryCodeOrNull(ProfileDictType.OCCUPATION, req.getOccupation(), "职业"));
        }
        if (visible(settings, "annualIncome")) {
            user.setAnnualIncome(dictionaryCodeOrNull(
                    ProfileDictType.ANNUAL_INCOME, req.getAnnualIncome(), "年收入"));
        }
        if (visible(settings, "maritalStatus")) {
            user.setMaritalStatus(dictionaryCodeOrNull(
                    ProfileDictType.MARITAL_STATUS, req.getMaritalStatus(), "婚姻状况"));
        }
        if (visible(settings, "locationProvince")) user.setLocationProvince(trimToNull(req.getLocationProvince()));
        if (visible(settings, "locationCity")) user.setLocationCity(trimToNull(req.getLocationCity()));
        if (visible(settings, "locationDistrict")) user.setLocationDistrict(trimToNull(req.getLocationDistrict()));
        if (visible(settings, "hometownProvince")) user.setHometownProvince(trimToNull(req.getHometownProvince()));
        if (visible(settings, "hometownCity")) user.setHometownCity(trimToNull(req.getHometownCity()));
        if (visible(settings, "hometownDistrict")) user.setHometownDistrict(trimToNull(req.getHometownDistrict()));
        if (visible(settings, "company")) {
            user.setCompany(validatedText(req.getCompany(), 2, 50, "公司名称需2-50个字符"));
        }
        if (visible(settings, "school")) {
            user.setSchool(validatedText(req.getSchool(), 2, 50, "学校名称需2-50个字符"));
        }
        if (visible(settings, "major")) {
            user.setMajor(validatedText(req.getMajor(), 1, 100, "专业名称不能超过100个字符"));
        }
    }

    private boolean visible(List<BasicProfileFieldVO> settings, String fieldId) {
        return fieldConfigResolver.isBasicFieldVisible(settings, fieldId);
    }

    private String dictionaryCodeOrNull(String dictType, String code, String label) {
        String normalized = trimToNull(code);
        return normalized == null ? null : profileDictionaryService.requireCode(dictType, normalized, label);
    }

    /** 性别支持大小写输入，但业务表统一保存枚举大写 code。 */
    private String genderCodeOrNull(String code) {
        String normalized = trimToNull(code);
        if (normalized == null) {
            return null;
        }
        GenderEnum gender = GenderEnum.getByCode(normalized.toUpperCase(Locale.ROOT));
        if (gender == null) {
            throw new BusinessException("性别只能为MALE或FEMALE");
        }
        return gender.getCode();
    }

    private String validatedText(String value, int minLength, int maxLength, String message) {
        String normalized = trimToNull(value);
        if (normalized != null && (normalized.length() < minLength || normalized.length() > maxLength)) {
            throw new BusinessException(message);
        }
        return normalized;
    }

    private String trimToNull(String value) {
        return StrUtil.isBlank(value) ? null : value.trim();
    }

    private LocalDate parseBirthday(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }
        try {
            return LocalDate.parse(normalized);
        } catch (Exception ex) {
            throw new BusinessException("出生日期格式必须为yyyy-MM-dd");
        }
    }

    private void validateAllowedAge(LocalDate birthday) {
        if (birthday == null) {
            return;
        }
        int age = scoreConfig.calculateAge(birthday);
        Prd01FieldConfigResolver.AgeRange range = fieldConfigResolver.ageRange();
        if (age < range.minAge() || age > range.maxAge()) {
            throw new BusinessException("当前年龄不符合平台使用要求，允许范围为"
                    + range.minAge() + "-" + range.maxAge() + "岁");
        }
    }

    private void validateRange(Integer value, int min, int max, String message) {
        if (value != null && (value < min || value > max)) {
            throw new BusinessException(message);
        }
    }

    /** 校验首登步骤号，当前移动端固定五步。 */
    private void validateInitStep(ProfileInitStepReq req) {
        if (req == null || req.getStep() == null || req.getStep() < 1 || req.getStep() > 5) {
            throw new BusinessException("首登步骤必须在1-5之间");
        }
    }

    /** 读取持久化流程进度；历史数据没有进度字段时按已有必填资料兼容推断。 */
    private Integer resolvePersistedNextStep(AppUser user) {
        Integer persisted = user.getFirstLoginNextStep();
        int fromStep = persisted != null ? persisted : fieldConfigResolver.inferNextStep(user);
        Integer visibleStep = fieldConfigResolver.nextVisibleStep(fromStep);
        return visibleStep != null ? visibleStep : fieldConfigResolver.nextVisibleStep(1);
    }

    /** 生成下一步动作编码，完成时返回 COMPLETED。 */
    private String nextAction(Integer nextStep) {
        return nextStep == null ? "COMPLETED" : "CONTINUE_STEP_" + nextStep;
    }

    /** 每个步骤只接受本步骤字段，避免首登接口被当作通用资料修改接口。 */
    private void validateStepPayload(ProfileInitStepReq req) {
        boolean gender = StrUtil.isNotBlank(req.getGender());
        boolean birthday = StrUtil.isNotBlank(req.getBirthday());
        boolean identity = StrUtil.isNotBlank(req.getIdentity());
        boolean education = StrUtil.isNotBlank(req.getEducationLevel());
        boolean location = StrUtil.isNotBlank(req.getLocationProvince())
                || StrUtil.isNotBlank(req.getLocationCity())
                || StrUtil.isNotBlank(req.getLocationDistrict());

        boolean invalid = switch (req.getStep()) {
            case 1 -> birthday || identity || education || location;
            case 2 -> gender || identity || education || location;
            case 3 -> gender || birthday || education || location;
            case 4 -> gender || birthday || identity || location;
            case 5 -> gender || birthday || identity || education;
            default -> true;
        };
        if (invalid) {
            String allowed = switch (req.getStep()) {
                case 1 -> "性别";
                case 2 -> "出生日期";
                case 3 -> "身份";
                case 4 -> "学历";
                case 5 -> "现居省市区";
                default -> "当前步骤字段";
            };
            throw new BusinessException("第" + req.getStep() + "步只能提交" + allowed);
        }
    }

    /** 将当前步骤中的非空字段应用到用户实体。 */
    private void applyStepFields(AppUser user, ProfileInitStepReq req) {
        switch (req.getStep()) {
            case 1 -> {
                if (StrUtil.isNotBlank(req.getGender())) user.setGender(req.getGender());
            }
            case 2 -> {
                if (StrUtil.isNotBlank(req.getBirthday())) {
                    try {
                        user.setBirthday(LocalDate.parse(req.getBirthday()));
                    } catch (Exception ex) {
                        throw new BusinessException("出生日期格式必须为yyyy-MM-dd");
                    }
                }
            }
            case 3 -> {
                if (StrUtil.isNotBlank(req.getIdentity())) {
                    user.setIdentity(profileDictionaryService.requireCode(
                            ProfileDictType.IDENTITY, req.getIdentity(), "身份"));
                }
            }
            case 4 -> {
                if (StrUtil.isNotBlank(req.getEducationLevel())) {
                    user.setEducationLevel(profileDictionaryService.requireCode(
                            ProfileDictType.EDUCATION_LEVEL, req.getEducationLevel(), "学历"));
                }
            }
            case 5 -> {
                if (StrUtil.isNotBlank(req.getLocationProvince())) user.setLocationProvince(req.getLocationProvince());
                if (StrUtil.isNotBlank(req.getLocationCity())) user.setLocationCity(req.getLocationCity());
                if (StrUtil.isNotBlank(req.getLocationDistrict())) user.setLocationDistrict(req.getLocationDistrict());
            }
            default -> throw new BusinessException("首登步骤必须在1-5之间");
        }
    }

    /** 将实体转换为资料详情 VO */
    private ProfileDetailVO toDetailVO(AppUser user, boolean includeAccessStatus) {
        ProfileDetailVO vo = new ProfileDetailVO();
        vo.setUserId(user.getId());
        vo.setAvatar(auditContentService.ownerAvatar(user.getId()));
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentity(user.getIdentity());
        vo.setIndustry(user.getIndustry());
        vo.setOccupation(user.getOccupation());
        vo.setCompany(user.getCompany());
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
        vo.setAboutMe(auditContentService.ownerText(user.getId(), AppUserAuditTypeEnum.ABOUT_ME));
        vo.setHopeTheyKnow(auditContentService.ownerText(user.getId(), AppUserAuditTypeEnum.HOPE_THEY_KNOW));
        applyVoiceIntro(vo, user.getId());
        vo.setTags(user.getTags());
        vo.setPhotos(toJson(auditContentService.ownerAlbumPhotos(user.getId())));
        vo.setProfileBgImage(auditContentService.ownerProfileBackground(user.getId()));
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(user.getProfileScore());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        if (includeAccessStatus) {
            vo.setAccessStatus(getAccessStatus(user.getId()));
        }
        return vo;
    }

    /** 将用户实体转换为基础资料页专用响应，避免返回扩展资料和审核字段。 */
    private BasicProfileVO toBasicProfileVO(AppUser user, List<BasicProfileFieldVO> settings) {
        BasicProfileVO vo = new BasicProfileVO();
        vo.setUserId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() == null ? null : user.getBirthday().toString());
        vo.setAge(user.getBirthday() == null ? user.getAge() : scoreConfig.calculateAge(user.getBirthday()));
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentity(user.getIdentity());
        vo.setEducationLevel(user.getEducationLevel());
        vo.setIndustry(user.getIndustry());
        vo.setOccupation(user.getOccupation());
        vo.setCompany(user.getCompany());
        vo.setAnnualIncome(user.getAnnualIncome());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setLocationDistrict(user.getLocationDistrict());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setHometownDistrict(user.getHometownDistrict());
        vo.setSchool(user.getSchool());
        vo.setMajor(user.getMajor());
        vo.setMaritalStatus(user.getMaritalStatus());
        Prd01FieldConfigResolver.AgeRange ageRange = fieldConfigResolver.ageRange();
        vo.setMinAge(ageRange.minAge());
        vo.setMaxAge(ageRange.maxAge());
        vo.setProfileScore(user.getProfileScore());
        List<String> missing = fieldConfigResolver.missingRequiredBasicFields(user, settings);
        vo.setMissingRequiredFields(missing);
        vo.setBasicProfileCompleted(missing.isEmpty());
        vo.setNextAction(missing.isEmpty() ? "ADD_AVATAR" : "COMPLETE_BASIC_PROFILE");
        vo.setFieldSettings(settings);
        return vo;
    }

    /** 语音介绍从统一审核记录实时派生，app_user 不保存语音审核快照。 */
    private void applyVoiceIntro(ProfileDetailVO vo, Long userId) {
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.VOICE_INTRO);
        AppUserAuditRecord effective = auditService.latestEffectiveRecord(userId, AppUserAuditTypeEnum.VOICE_INTRO);
        AppUserAuditRecord display = latest != null ? latest : effective;
        if (display == null) {
            vo.setVoiceIntroUrl(null);
            vo.setVoiceIntroDuration(null);
            vo.setVoiceIntroAuditStatus("NOT_SUBMITTED");
            vo.setVoiceIntroRejectReason(null);
            return;
        }
        vo.setVoiceIntroUrl(effective != null ? effective.getMediaUrl() : null);
        vo.setVoiceIntroDuration(display.getDuration());
        vo.setVoiceIntroAuditStatus(display.getStatus());
        vo.setVoiceIntroRejectReason(StrUtil.blankToDefault(display.getRejectReason(), display.getExpiredReason()));
    }

    /** 将相册地址列表序列化为接口约定的 JSON 字符串。 */
    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("相册数据序列化失败");
        }
    }

    /** 查询用户，不存在抛异常 */
    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }
}
