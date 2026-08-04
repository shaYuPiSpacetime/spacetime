package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.SongSearchProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.miniapp.dto.request.ProfileInitStepReq;
import com.spacetime.miniapp.dto.request.BasicProfileSaveReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.BasicProfileVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("首登五步资料状态机")
class ProfileServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppConfigDao appConfigDao;
    @Mock
    private AppUserAuditService auditService;
    @Mock
    private AppUserAuditContentService auditContentService;
    @Mock
    private ProfileDictionaryService profileDictionaryService;
    @Mock
    private VerificationService verificationService;
    @Mock
    private SongSearchProvider songSearchProvider;
    @Mock
    private DictDataDao dictDataDao;

    @BeforeEach
    void setUpDictionaryDefaults() {
        org.mockito.Mockito.lenient().when(profileDictionaryService.requireCode(
                        org.mockito.ArgumentMatchers.eq(ProfileDictType.GENDER),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.eq("性别")))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    @Test
    @DisplayName("选填步骤允许空值提交并推进进度")
    void shouldAdvanceWhenOptionalStepIsEmpty() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(optionalBirthday())));
        AppUser user = baseUser(2);
        user.setBirthday(null);
        when(appUserDao.selectById(7L)).thenReturn(user);

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(2);
        ProfileInitStatusVO result = newService().saveInitStep(7L, req);

        assertThat(result.getFirstLoginCompleted()).isFalse();
        assertThat(result.getNextStep()).isEqualTo(3);
        assertThat(result.getCompletedSteps()).containsExactly(1, 2);
        assertThat(user.getFirstLoginNextStep()).isEqualTo(3);
        assertThat(user.getBirthday()).isNull();
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("隐藏步骤由后端自动跳过")
    void shouldSkipHiddenStep() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(hiddenBirthday())));
        AppUser user = baseUser(1);
        user.setGender(null);
        when(appUserDao.selectById(7L)).thenReturn(user);

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(1);
        req.setGender("FEMALE");
        ProfileInitStatusVO result = newService().saveInitStep(7L, req);

        assertThat(result.getNextStep()).isEqualTo(3);
        assertThat(user.getFirstLoginNextStep()).isEqualTo(3);
    }

    @Test
    @DisplayName("最后一个可见步骤保存成功后自动完成首登")
    void shouldCompleteAfterLastVisibleStep() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(allFieldsRequired())));
        AppUser user = completedUntilStepFive();
        when(appUserDao.selectById(7L)).thenReturn(user);

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(5);
        req.setLocationProvince("上海市");
        req.setLocationCity("上海市");
        req.setLocationDistrict("浦东新区");
        ProfileInitStatusVO result = newService().saveInitStep(7L, req);

        assertThat(result.getFirstLoginCompleted()).isTrue();
        assertThat(result.getNextStep()).isNull();
        assertThat(result.getNextAction()).isEqualTo("COMPLETED");
        assertThat(user.getFirstLoginCompleted()).isEqualTo(1);
        assertThat(user.getFirstLoginNextStep()).isNull();
    }

    @Test
    @DisplayName("首登城市没有区县节点时允许两级地址完成")
    void shouldCompleteTwoLevelAddressWhenCityHasNoDistricts() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(conditionalDistrictFields())));
        AppUser user = completedUntilStepFive();
        when(appUserDao.selectById(7L)).thenReturn(user);
        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(5);
        req.setLocationProvince("330000");
        req.setLocationCity("330100");

        ProfileInitStatusVO result = newService().saveInitStep(7L, req);

        assertThat(result.getFirstLoginCompleted()).isTrue();
        assertThat(user.getLocationProvince()).isEqualTo("330000");
        assertThat(user.getLocationCity()).isEqualTo("330100");
        assertThat(user.getLocationDistrict()).isNull();
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("首登现居地固定省市两级，旧配置也不得要求区县")
    void shouldAllowTwoLevelLocationUnderLegacyDistrictConfig() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(legacyRequiredDistrictFields())));
        AppUser user = completedUntilStepFive();
        when(appUserDao.selectById(7L)).thenReturn(user);
        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(5);
        req.setLocationProvince("140000");
        req.setLocationCity("140200");

        ProfileInitStatusVO result = newService().saveInitStep(7L, req);

        assertThat(result.getFirstLoginCompleted()).isTrue();
        assertThat(user.getLocationProvince()).isEqualTo("140000");
        assertThat(user.getLocationCity()).isEqualTo("140200");
        assertThat(user.getLocationDistrict()).isNull();
        verify(profileDictionaryService, never()).hasEnabledRegionChildren(any());
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("不能越过当前步骤提交后续步骤")
    void shouldRejectFutureStep() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(allFieldsRequired())));
        AppUser user = baseUser(2);
        when(appUserDao.selectById(7L)).thenReturn(user);

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(4);
        req.setEducationLevel("BACHELOR");

        assertThatThrownBy(() -> newService().saveInitStep(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前应填写第2步");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("每一步只能提交本步骤字段")
    void shouldRejectFieldsFromAnotherStep() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(allFieldsRequired())));
        AppUser user = baseUser(1);
        when(appUserDao.selectById(7L)).thenReturn(user);

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(1);
        req.setGender("FEMALE");
        req.setEducationLevel("BACHELOR");

        assertThatThrownBy(() -> newService().saveInitStep(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只能提交性别");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("身份提交中文值时拒绝写入业务表")
    void shouldRejectChineseIdentityValue() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(allFieldsRequired())));
        AppUser user = baseUser(3);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "职场人", "身份"))
                .thenThrow(new BusinessException("身份编码不存在或已停用"));

        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(3);
        req.setIdentity("职场人");

        assertThatThrownBy(() -> newService().saveInitStep(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("身份编码不存在或已停用");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("基础资料查询返回反显值、字段配置和缺失必填项")
    void shouldReturnBasicProfileWithDynamicFieldSettings() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(basicProfileFields())));
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setGender("FEMALE");
        user.setBirthday(LocalDate.of(1997, 3, 6));
        user.setIdentity("WORKER");
        user.setEducationLevel("BACHELOR");
        user.setIndustry("INTERNET");
        user.setLocationProvince("330000");
        user.setLocationCity("330100");
        when(appUserDao.selectById(7L)).thenReturn(user);

        BasicProfileVO result = newService().getBasicProfile(7L);

        assertThat(result.getNickname()).isEqualTo("用户0007");
        assertThat(user.getNickname()).isEqualTo("用户0007");
        assertThat(result.getGender()).isEqualTo("FEMALE");
        assertThat(result.getIdentity()).isEqualTo("WORKER");
        assertThat(result.getIndustry()).isEqualTo("INTERNET");
        assertThat(result.getAge()).isEqualTo(new ProfileScoreConfig().calculateAge(user.getBirthday()));
        assertThat(result.getMinAge()).isEqualTo(18);
        assertThat(result.getMaxAge()).isEqualTo(60);
        assertThat(result.getMissingRequiredFields()).isEmpty();
        verify(appUserDao).updateById(user);
        assertThat(result.getFieldSettings())
                .filteredOn(item -> "gender".equals(item.getFieldId()))
                .singleElement()
                .satisfies(item -> assertThat(item.getEditable()).isTrue());
        assertThat(result.getFieldSettings())
                .filteredOn(item -> "industry".equals(item.getFieldId()))
                .singleElement()
                .satisfies(item -> assertThat(item.getDictType()).isEqualTo("app_industry"));
        assertThat(result.getFieldSettings())
                .filteredOn(item -> "annualIncome".equals(item.getFieldId()))
                .singleElement()
                .satisfies(item -> assertThat(item.getDictType()).isEqualTo("app_annual_income"));
    }

    @Test
    @DisplayName("基础资料保存按字段配置校验并写入字典code")
    void shouldSaveBasicProfileWithDictionaryCodes() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(basicProfileFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setGender("FEMALE");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "WORKER", "身份"))
                .thenReturn("WORKER");
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        when(profileDictionaryService.requireCode(ProfileDictType.OCCUPATION, "ENGINEER", "职业"))
                .thenReturn("ENGINEER");
        when(profileDictionaryService.requireCode(ProfileDictType.INDUSTRY, "INTERNET", "行业"))
                .thenReturn("INTERNET");
        when(profileDictionaryService.requireCode(ProfileDictType.ANNUAL_INCOME, "FROM_150K_TO_300K", "年收入"))
                .thenReturn("FROM_150K_TO_300K");

        BasicProfileSaveReq req = new BasicProfileSaveReq();
        req.setNickname("林晓雨");
        req.setGender("MALE");
        req.setBirthday("1997-03-06");
        req.setHeight(163);
        req.setWeight(45);
        req.setIdentity("WORKER");
        req.setEducationLevel("BACHELOR");
        req.setOccupation("ENGINEER");
        req.setIndustry("INTERNET");
        req.setAnnualIncome("FROM_150K_TO_300K");
        req.setCompany("星河科技有限公司");
        req.setLocationProvince("330000");
        req.setLocationCity("330100");
        req.setHometownProvince("410000");
        req.setHometownCity("410100");

        BasicProfileVO result = newService().saveBasicProfile(7L, req);

        assertThat(user.getNickname()).isEqualTo("林晓雨");
        assertThat(user.getGender()).isEqualTo("MALE");
        assertThat(user.getIndustry()).isEqualTo("INTERNET");
        assertThat(user.getOccupation()).isEqualTo("ENGINEER");
        assertThat(user.getAnnualIncome()).isEqualTo("FROM_150K_TO_300K");
        assertThat(user.getCompany()).isEqualTo("星河科技有限公司");
        assertThat(result.getBasicProfileCompleted()).isTrue();
        assertThat(result.getNextAction()).isEqualTo("ADD_AVATAR");
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("基础资料所选城市没有区县节点时允许条件必填区县为空")
    void shouldAllowEmptyConditionalDistrictWhenCityHasNoDistricts() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(conditionalDistrictFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "WORKER", "身份"))
                .thenReturn("WORKER");
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");

        BasicProfileSaveReq req = validBasicProfileReq();

        BasicProfileVO result = newService().saveBasicProfile(7L, req);

        assertThat(result.getBasicProfileCompleted()).isTrue();
        assertThat(user.getLocationDistrict()).isNull();
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("基础资料现居地固定省市两级，不检查城市区县节点")
    void shouldAllowTwoLevelLocationWhenCityHasDistricts() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(conditionalDistrictFields())));
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "WORKER", "身份"))
                .thenReturn("WORKER");
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        BasicProfileSaveReq req = validBasicProfileReq();

        BasicProfileVO result = newService().saveBasicProfile(7L, req);

        assertThat(result.getBasicProfileCompleted()).isTrue();
        assertThat(user.getLocationDistrict()).isNull();
        verify(profileDictionaryService, never()).hasEnabledRegionChildren(any());
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("家乡固定省市两级，即使城市存在区县也不要求家乡区县")
    void shouldAllowHometownDistrictEmptyBecauseHometownIsTwoLevel() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(hometownTwoLevelFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "WORKER", "身份"))
                .thenReturn("WORKER");
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        BasicProfileSaveReq req = validBasicProfileReq();
        req.setHometownProvince("410000");
        req.setHometownCity("410100");

        BasicProfileVO result = newService().saveBasicProfile(7L, req);

        assertThat(result.getBasicProfileCompleted()).isTrue();
        assertThat(user.getHometownProvince()).isEqualTo("410000");
        assertThat(user.getHometownCity()).isEqualTo("410100");
        assertThat(user.getHometownDistrict()).isNull();
        verify(appUserDao).updateById(user);
        verify(profileDictionaryService, never()).hasEnabledRegionChildren("410100");
    }

    @Test
    @DisplayName("两级地址保存时统一清理请求中的历史区县值")
    void shouldClearLegacyDistrictValuesWhenSavingTwoLevelRegions() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(hometownTwoLevelFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setLocationDistrict("330106");
        user.setHometownDistrict("410102");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.IDENTITY, "WORKER", "身份"))
                .thenReturn("WORKER");
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        BasicProfileSaveReq req = validBasicProfileReq();
        req.setLocationDistrict("330106");
        req.setHometownProvince("410000");
        req.setHometownCity("410100");
        req.setHometownDistrict("410102");

        BasicProfileVO result = newService().saveBasicProfile(7L, req);

        assertThat(result.getLocationDistrict()).isNull();
        assertThat(result.getHometownDistrict()).isNull();
        assertThat(user.getLocationDistrict()).isNull();
        assertThat(user.getHometownDistrict()).isNull();
        verify(appUserDao).updateById(user);
    }

    @Test
    @DisplayName("基础资料必填项缺失时不写库")
    void shouldRejectMissingRequiredBasicField() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(basicProfileFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setGender("FEMALE");
        when(appUserDao.selectById(7L)).thenReturn(user);

        BasicProfileSaveReq req = new BasicProfileSaveReq();
        req.setBirthday("1997-03-06");
        req.setIdentity("WORKER");
        req.setEducationLevel("BACHELOR");
        req.setLocationProvince("330000");
        req.setLocationCity("330100");

        assertThatThrownBy(() -> newService().saveBasicProfile(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("昵称不能为空");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("基础资料身高超出正式规则时不写库")
    void shouldRejectInvalidHeight() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(basicProfileFields())));
        when(appConfigDao.selectByGroup("PRD01_ACCESS")).thenReturn(List.of());
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setGender("FEMALE");
        when(appUserDao.selectById(7L)).thenReturn(user);

        BasicProfileSaveReq req = validBasicProfileReq();
        req.setHeight(221);

        assertThatThrownBy(() -> newService().saveBasicProfile(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("身高需在140-220cm之间");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("基础资料性别只接受MALE或FEMALE")
    void shouldRejectInvalidGender() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD"))
                .thenReturn(List.of(config(basicProfileFields())));
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        when(appUserDao.selectById(7L)).thenReturn(user);

        BasicProfileSaveReq req = validBasicProfileReq();
        req.setGender("UNKNOWN");
        when(profileDictionaryService.requireCode(ProfileDictType.GENDER, "UNKNOWN", "性别"))
                .thenThrow(new BusinessException("性别编码不存在或已停用"));

        assertThatThrownBy(() -> newService().saveBasicProfile(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("性别编码不存在或已停用");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("首登性别code被字典停用后拒绝写入")
    void shouldRejectInitGenderDisabledByDictionary() {
        when(appConfigDao.selectByGroup("PRD01_PROFILE_FIELD")).thenReturn(List.of(config(allFieldsRequired())));
        AppUser user = baseUser(1);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode(ProfileDictType.GENDER, "FEMALE", "性别"))
                .thenThrow(new BusinessException("性别编码不存在或已停用"));
        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(1);
        req.setGender("FEMALE");

        assertThatThrownBy(() -> newService().saveInitStep(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("性别编码不存在或已停用");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("首登现居地code不存在时拒绝完成流程")
    void shouldRejectUnknownMainlandRegionCode() {
        AppUser user = completedUntilStepFive();
        when(appUserDao.selectById(7L)).thenReturn(user);
        ProfileInitStepReq req = new ProfileInitStepReq();
        req.setStep(5);
        req.setLocationProvince("999999");
        req.setLocationCity("999900");

        ProfileDictionaryService realDictionaryService = new ProfileDictionaryService(dictDataDao);
        assertThatThrownBy(() -> newService(realDictionaryService).saveInitStep(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("REGION_NOT_SUPPORTED");
        verify(appUserDao, never()).updateById(user);
    }

    @Test
    @DisplayName("准入状态按后台年龄门槛拦截超龄用户")
    void shouldBlockAccessWhenBirthdayOutsideConfiguredAgeRange() {
        org.mockito.Mockito.lenient().when(appConfigDao.selectByKeys(org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(List.of(
                        config("prd01.access.minAge", "25", "PRD01_ACCESS"),
                        config("prd01.access.maxAge", "30", "PRD01_ACCESS"),
                        config("prd01.copy.rules",
                                "{\"rows\":[{\"copyKey\":\"error_age_not_allowed\",\"enabled\":true,\"content\":\"年龄不符合准入要求\"}]}",
                                "PRD01_COPY")
                ));
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setBirthday(LocalDate.of(1980, 1, 1));
        when(appUserDao.selectById(7L)).thenReturn(user);

        AccessStatusVO result = newService().getAccessStatus(7L);

        assertThat(result.getCoreAccessStatus()).isEqualTo("CORE_BLOCKED");
        assertThat(result.getCanBrowseCards()).isFalse();
        assertThat(result.getBlockReasons()).contains("年龄不符合准入要求");
    }

    @Test
    @DisplayName("资料完整度按后台计分配置和审核记录实时计算")
    void shouldCalculateProfileScoreFromRuntimeConfigAndAuditRecords() {
        org.mockito.Mockito.lenient().when(appConfigDao.selectByKeys(org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(List.of(
                        config("prd01.profile.fieldSettings",
                                "{\"rows\":["
                                        + "{\"fieldId\":\"avatarImage\",\"visible\":true,\"scoreEnabled\":true},"
                                        + "{\"fieldId\":\"aboutMe\",\"visible\":true,\"scoreEnabled\":true}"
                                        + "]}",
                                "PRD01_PROFILE_FIELD"),
                        config("prd01.profile.scoreWeights",
                                "{\"rows\":["
                                        + "{\"fieldId\":\"avatarImage\",\"label\":\"头像\",\"studentScore\":4,\"workerScore\":4},"
                                        + "{\"fieldId\":\"aboutMe\",\"label\":\"关于我\",\"studentScore\":5,\"workerScore\":5}"
                                        + "]}",
                                "PRD01_PROFILE_SCORE")
                ));
        AppUser user = baseUser(null);
        user.setFirstLoginCompleted(1);
        user.setIdentity("WORKER");
        when(appUserDao.selectById(7L)).thenReturn(user);
        org.mockito.Mockito.lenient().when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR))
                .thenReturn(record(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED));
        org.mockito.Mockito.lenient().when(auditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.ABOUT_ME))
                .thenReturn(record(AppUserAuditTypeEnum.ABOUT_ME, AppUserAuditStatusEnum.APPROVED));

        ProfileDetailVO result = newService().getDetail(7L);

        assertThat(result.getProfileScore()).isEqualTo(9);
    }

    private ProfileServiceImpl newService() {
        return newService(profileDictionaryService);
    }

    private ProfileServiceImpl newService(ProfileDictionaryService dictionaryService) {
        ObjectMapper mapper = new ObjectMapper();
        Prd01FieldConfigResolver resolver = new Prd01FieldConfigResolver(appConfigDao, mapper);
        ProfileScoreConfig scoreConfig = new ProfileScoreConfig();
        Prd01RuntimeConfigResolver runtimeConfigResolver = new Prd01RuntimeConfigResolver(appConfigDao, mapper);
        Prd01AccessEvaluator accessEvaluator = new Prd01AccessEvaluator(scoreConfig, auditService, runtimeConfigResolver);
        Prd01ProfileCompletenessCalculator completenessCalculator =
                new Prd01ProfileCompletenessCalculator(runtimeConfigResolver, auditService);
        return new ProfileServiceImpl(appUserDao, scoreConfig, auditService, auditContentService,
                resolver, dictionaryService, mapper, accessEvaluator, completenessCalculator,
                runtimeConfigResolver, verificationService, songSearchProvider);
    }

    private AppUser baseUser(Integer nextStep) {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        user.setFirstLoginNextStep(nextStep);
        return user;
    }

    private AppUser completedUntilStepFive() {
        AppUser user = baseUser(5);
        user.setGender("FEMALE");
        user.setBirthday(LocalDate.of(2000, 1, 1));
        user.setIdentity("WORKER");
        user.setEducationLevel("BACHELOR");
        return user;
    }

    private AppConfig config(String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.profile.fieldSettings");
        config.setConfigValue(value);
        config.setConfigGroup("PRD01_PROFILE_FIELD");
        return config;
    }

    private AppConfig config(String key, String value, String group) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        config.setConfigGroup(group);
        return config;
    }

    private AppUserAuditRecord record(AppUserAuditTypeEnum type, AppUserAuditStatusEnum status) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        return record;
    }

    private String optionalBirthday() {
        return configJson(true, false);
    }

    private String hiddenBirthday() {
        return configJson(false, false);
    }

    private String allFieldsRequired() {
        return configJson(true, true);
    }

    private String conditionalDistrictFields() {
        return "{\"rows\":["
                + "{\"fieldId\":\"gender\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"birthday\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":true,\"requiredMode\":\"conditional\"}"
                + "]}";
    }

    private String legacyRequiredDistrictFields() {
        return "{\"rows\":["
                + "{\"fieldId\":\"gender\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"birthday\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":true}"
                + "]}";
    }

    private String hometownTwoLevelFields() {
        return "{\"rows\":["
                + "{\"fieldId\":\"gender\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"birthday\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"hometownProvince\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"hometownCity\",\"visible\":true,\"required\":true,\"requiredMode\":\"fixed\"},"
                + "{\"fieldId\":\"hometownDistrict\",\"visible\":true,\"required\":true,\"requiredMode\":\"conditional\"}"
                + "]}";
    }

    private String configJson(boolean birthdayVisible, boolean birthdayRequired) {
        return "{\"rows\":["
                + "{\"fieldId\":\"gender\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"birthday\",\"visible\":" + birthdayVisible + ",\"required\":" + birthdayRequired + "},"
                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false}"
                + "]}";
    }

    private String basicProfileFields() {
        return "{\"rows\":["
                + "{\"fieldId\":\"gender\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"birthday\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"nickname\",\"visible\":true,\"required\":true},"
                + "{\"fieldId\":\"height\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"weight\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"hometownProvince\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"hometownCity\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"hometownDistrict\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"industry\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"occupation\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"company\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"annualIncomeRange\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"school\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"major\",\"visible\":true,\"required\":false},"
                + "{\"fieldId\":\"maritalStatus\",\"visible\":true,\"required\":false}"
                + "]}";
    }

    private BasicProfileSaveReq validBasicProfileReq() {
        BasicProfileSaveReq req = new BasicProfileSaveReq();
        req.setNickname("林晓雨");
        req.setGender("FEMALE");
        req.setBirthday("1997-03-06");
        req.setHeight(163);
        req.setWeight(45);
        req.setIdentity("WORKER");
        req.setEducationLevel("BACHELOR");
        req.setLocationProvince("330000");
        req.setLocationCity("330100");
        return req;
    }
}
