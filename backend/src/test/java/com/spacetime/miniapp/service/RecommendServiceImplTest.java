package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.RecommendPreferenceSaveReq;
import com.spacetime.miniapp.dto.request.RecommendViewActionReq;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.RecommendCandidatePageVO;
import com.spacetime.miniapp.dto.response.RecommendPreferenceVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.service.impl.RecommendServiceImpl;
import com.spacetime.miniapp.service.impl.Prd01AccessEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 推荐偏好服务测试。 */
@ExtendWith(MockitoExtension.class)
@DisplayName("推荐偏好服务")
class RecommendServiceImplTest {

    @Mock private AppUserDao appUserDao;
    @Mock private RecommendPreferenceDao preferenceDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private RecommendViewLogDao viewLogDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private MiniappPublicProfileService publicProfileService;
    @Mock private VipService vipService;
    @Mock private Prd01AccessEvaluator accessEvaluator;

    @InjectMocks private RecommendServiceImpl service;

    @BeforeEach
    void allowRecommendationBrowsingByDefault() {
        lenient().when(accessEvaluator.evaluate(any(AppUser.class))).thenReturn(browsableAccess());
    }

    @Test
    @DisplayName("无保存记录时返回现居城市和年龄前后五岁的临时默认值")
    void getPreferencesShouldReturnUnsavedDefaults() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(null);
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");

        RecommendPreferenceVO result = service.getPreferences(7L);

        assertThat(result.getVersion()).isZero();
        assertThat(result.getDefaulted()).isTrue();
        assertThat(result.getMinAge()).isEqualTo(25);
        assertThat(result.getMaxAge()).isEqualTo(35);
        assertThat(result.getTargetCities()).singleElement().satisfies(city -> {
            assertThat(city.getCode()).isEqualTo("320100");
            assertThat(city.getName()).isEqualTo("南京");
        });
        assertThat(result.getVipEffective()).isFalse();
        assertThat(result.getNeighborCityAvailable()).isFalse();
        assertThat(result.getNeighborCityDisabledReason()).contains("暂未配置");
        verify(preferenceDao, never()).insert(any());
    }

    @Test
    @DisplayName("周边城市映射存在时偏好页开放开关")
    void getPreferencesShouldExposeNeighborCityCapabilityFromRuntimeConfig() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(null);
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");
        when(appConfigDao.selectByKey("prd08.recommend.neighbor-city-map"))
                .thenReturn(config("prd08.recommend.neighbor-city-map",
                        "{\"320100\":[\"320200\",\"320400\"]}"));

        RecommendPreferenceVO result = service.getPreferences(7L);

        assertThat(result.getNeighborCityAvailable()).isTrue();
        assertThat(result.getNeighborCityDisabledReason()).isNull();
    }

    @Test
    @DisplayName("周边城市数据缺失时服务端强制关闭开关")
    void savePreferencesShouldDisableNeighborCityWithoutConfiguredMapping() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(null);
        RecommendPreferenceSaveReq req = basicRequest(0);
        req.setAllowNeighborCity(true);

        RecommendPreferenceVO result = service.savePreferences(7L, req);

        ArgumentCaptor<RecommendPreference> captor = ArgumentCaptor.forClass(RecommendPreference.class);
        verify(preferenceDao).insert(captor.capture());
        assertThat(captor.getValue().getAllowNeighborCity()).isZero();
        assertThat(result.getAllowNeighborCity()).isFalse();
        assertThat(result.getNeighborCityAvailable()).isFalse();
    }

    @Test
    @DisplayName("基础资料完成但三项认证未通过时仍可查询推荐偏好")
    void getPreferencesShouldAllowNonCoreUser() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("CLOSED");
        when(preferenceDao.selectByUserId(7L)).thenReturn(null);
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");

        RecommendPreferenceVO result = service.getPreferences(7L);

        assertThat(result.getDefaulted()).isTrue();
        assertThat(result.getTargetCities()).singleElement()
                .satisfies(city -> assertThat(city.getCode()).isEqualTo("320100"));
    }

    @Test
    @DisplayName("普通用户只能保存基础条件并创建版本一")
    void savePreferencesShouldCreateBasicPreferenceForNormalUser() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(null);

        RecommendPreferenceSaveReq req = basicRequest(0);
        RecommendPreferenceVO result = service.savePreferences(7L, req);

        assertThat(result.getVersion()).isEqualTo(1);
        assertThat(result.getDefaulted()).isFalse();
        verify(preferenceDao).insert(any(RecommendPreference.class));
    }

    @Test
    @DisplayName("普通用户提交高级条件时拒绝保存")
    void savePreferencesShouldRejectAdvancedFieldsWithoutVip() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");

        RecommendPreferenceSaveReq req = basicRequest(0);
        req.setMinHeight(165);
        req.setMaxHeight(180);

        assertThatThrownBy(() -> service.savePreferences(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("会员");
        verify(preferenceDao, never()).insert(any());
    }

    @Test
    @DisplayName("会员有效但高级筛选权益未启用时仍拒绝保存高级条件")
    void savePreferencesShouldRequireAdvancedFilterBenefit() {
        AppUser user = openUser(7L, 30, "320100");
        UserAsset asset = new UserAsset();
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(1));
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);

        RecommendPreferenceSaveReq req = basicRequest(0);
        req.setMinHeight(165);
        req.setMaxHeight(180);

        assertThatThrownBy(() -> service.savePreferences(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("高级筛选权益");
        verify(preferenceDao, never()).insert(any());
    }

    @Test
    @DisplayName("目标城市编码不存在时拒绝保存而不是写入脏偏好")
    void savePreferencesShouldValidateTargetCityDictionary() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(profileDictionaryService.requireCode("china_region", "320100", "目标城市"))
                .thenThrow(new BusinessException("目标城市编码不存在或已停用"));

        assertThatThrownBy(() -> service.savePreferences(7L, basicRequest(0)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("目标城市编码不存在");
        verify(preferenceDao, never()).insert(any());
    }

    @Test
    @DisplayName("学校结构化字典缺失时拒绝保存学校 code 条件")
    void savePreferencesShouldRejectSchoolCodesUntilDictionaryExists() {
        AppUser user = openUser(7L, 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");

        RecommendPreferenceSaveReq req = basicRequest(0);
        req.setSchoolCodes(List.of("SCHOOL-001"));

        assertThatThrownBy(() -> service.savePreferences(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("学校字典暂未配置");
        verify(preferenceDao, never()).insert(any());
    }

    @Test
    @DisplayName("旧版本保存失败时返回版本冲突且不静默覆盖")
    void savePreferencesShouldRejectVersionConflict() {
        AppUser user = openUser(7L, 30, "320100");
        UserAsset asset = new UserAsset();
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(1));
        RecommendPreference existing = new RecommendPreference();
        existing.setUserId(7L);
        existing.setVersion(3);

        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);
        when(preferenceDao.selectByUserId(7L)).thenReturn(existing);

        assertThatThrownBy(() -> service.savePreferences(7L, basicRequest(2)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("其他设备更新");
        verify(preferenceDao, never()).updateByVersion(any(), any());
    }

    @Test
    @DisplayName("候选列表只返回异性、准入开放且未被双方阻断的用户")
    void getCandidatesShouldApplySafetyGateAndQuota() {
        AppUser current = openUser(7L, 30, "320100");
        AppUser allowed = openUser(8L, 28, "320100");
        allowed.setGender("FEMALE");
        allowed.setLastLoginTime(LocalDateTime.now().minusMinutes(1));
        AppUser closed = openUser(9L, 27, "320100");
        closed.setGender("FEMALE");
        AppUser blocked = openUser(10L, 29, "320100");
        blocked.setGender("FEMALE");

        RecommendPreference preference = basicPreference(7L, 2);
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference);
        when(appUserDao.selectList(any())).thenReturn(List.of(allowed, closed, blocked));
        when(accessProjectionService.projectAll(List.of(allowed, closed, blocked)))
                .thenReturn(Map.of(8L, "OPEN", 9L, "CLOSED", 10L, "OPEN"));
        when(relationBlockDao.selectActive(7L, 8L, "BLACKLIST")).thenReturn(null);
        when(relationBlockDao.selectActive(8L, 7L, "BLACKLIST")).thenReturn(null);
        when(relationBlockDao.selectActive(7L, 8L, "NO_RECOMMEND")).thenReturn(null);
        when(relationBlockDao.selectActive(7L, 10L, "BLACKLIST")).thenReturn(new AppUserRelationBlock());
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(config("commercial.view.quota.normal", "10")));
        when(viewLogDao.selectList(any())).thenReturn(List.of(viewLog(7L, 11L, "view", LocalDateTime.now())));
        PublicProfileVO profile = new PublicProfileVO();
        profile.setUserId(8L);
        profile.setNickname("候选人");
        when(publicProfileService.getPublicProfile(7L, 8L)).thenReturn(profile);

        RecommendCandidatePageVO result = service.getCandidates(7L, null);

        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getUserId()).isEqualTo(8L);
            assertThat(item.getProfile().getNickname()).isEqualTo("候选人");
        });
        assertThat(result.getRemainingBrowseCount()).isEqualTo(9);
        assertThat(result.getPreferenceVersion()).isEqualTo(2);
    }

    @Test
    @DisplayName("基础资料完成但三项认证未通过时仍返回已认证候选人")
    void getCandidatesShouldAllowNonCoreBrowseUser() {
        AppUser current = openUser(7L, 30, "320100");
        AppUser candidate = openUser(8L, 28, "320100");
        candidate.setGender("FEMALE");
        RecommendPreference preference = basicPreference(7L, 2);
        PublicProfileVO profile = new PublicProfileVO();
        profile.setUserId(8L);
        profile.setNickname("候选人");

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("CLOSED");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference);
        when(appUserDao.selectList(any())).thenReturn(List.of(candidate));
        when(accessProjectionService.projectAll(List.of(candidate))).thenReturn(Map.of(8L, "OPEN"));
        when(appConfigDao.selectByKeys(any()))
                .thenReturn(List.of(config("commercial.view.quota.normal", "10")));
        when(viewLogDao.selectList(any())).thenReturn(List.of());
        when(publicProfileService.getPublicProfile(7L, 8L)).thenReturn(profile);

        RecommendCandidatePageVO result = service.getCandidates(7L, null);

        assertThat(result.getItems()).singleElement()
                .satisfies(item -> assertThat(item.getUserId()).isEqualTo(8L));
        assertThat(result.getWaitingReason()).isNull();
    }

    @Test
    @DisplayName("最近登录时间为空的候选也能生成并继续使用游标")
    void getCandidatesShouldPageCandidatesWithNullLastLoginTime() {
        AppUser current = openUser(7L, 30, "320100");
        List<AppUser> candidates = LongStream.rangeClosed(8, 27).mapToObj(userId -> {
            AppUser candidate = openUser(userId, 28, "320100");
            candidate.setGender("FEMALE");
            candidate.setLastLoginTime(null);
            return candidate;
        }).toList();
        Map<Long, String> access = candidates.stream()
                .collect(java.util.stream.Collectors.toMap(AppUser::getId, item -> "OPEN"));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(basicPreference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(candidates);
        when(accessProjectionService.projectAll(any())).thenReturn(access);
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(config("commercial.view.quota.normal", "30")));
        when(viewLogDao.selectList(any())).thenReturn(List.of());
        when(publicProfileService.getPublicProfile(org.mockito.ArgumentMatchers.eq(7L), any()))
                .thenAnswer(invocation -> {
                    PublicProfileVO profile = new PublicProfileVO();
                    profile.setUserId(invocation.getArgument(1));
                    return profile;
                });

        RecommendCandidatePageVO first = service.getCandidates(7L, null);
        RecommendCandidatePageVO second = service.getCandidates(7L, first.getNextCursor());

        assertThat(first.getItems()).hasSize(20);
        assertThat(first.getNextCursor()).isNotBlank();
        assertThat(second.getItems()).hasSize(20);
    }

    @Test
    @DisplayName("重复曝光请求不得重复写浏览记录")
    void recordViewShouldBeIdempotent() {
        AppUser current = openUser(7L, 30, "320100");
        AppUser target = openUser(8L, 28, "320100");
        target.setGender("FEMALE");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(viewLogDao.selectByRequestAction(7L, "req-1", "view")).thenReturn(new RecommendViewLog());

        RecommendViewActionReq req = new RecommendViewActionReq();
        req.setRequestId("req-1");
        req.setFilterVersion(2);
        req.setPosition(1);
        service.recordAction(7L, "8", "view", req);

        verify(viewLogDao, never()).insert(any());
    }

    @Test
    @DisplayName("不再推荐应写入可被后续查询命中的启用关系和来源场景")
    void recordNeverShouldCreateEnabledNoRecommendBlock() {
        AppUser current = openUser(7L, 30, "320100");
        AppUser target = openUser(8L, 28, "320100");
        target.setGender("FEMALE");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(target)).thenReturn("OPEN");

        RecommendViewActionReq req = new RecommendViewActionReq();
        req.setRequestId("never-001");
        service.recordAction(7L, "8", "never", req);

        ArgumentCaptor<AppUserRelationBlock> captor =
                ArgumentCaptor.forClass(AppUserRelationBlock.class);
        verify(relationBlockDao).insert(captor.capture());
        assertThat(captor.getValue().getBlockType()).isEqualTo("NO_RECOMMEND");
        assertThat(captor.getValue().getStatus()).isEqualTo("ENABLED");
        assertThat(captor.getValue().getSourceScene()).isEqualTo("recommend");
    }

    @Test
    @DisplayName("三天回看仅会员可用并按候选去重保留最近动作")
    void getReplayShouldRequireVipAndDeduplicateCandidates() {
        AppUser current = openUser(7L, 30, "320100");
        UserAsset asset = new UserAsset();
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(2));
        RecommendViewLog latest = viewLog(7L, 8L, "skip", LocalDateTime.now());
        RecommendViewLog older = viewLog(7L, 8L, "view", LocalDateTime.now().minusHours(2));
        RecommendViewLog another = viewLog(7L, 9L, "detail", LocalDateTime.now().minusDays(1));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);
        when(vipService.getBenefits()).thenReturn(List.of(benefit("three_day_replay")));
        when(viewLogDao.selectList(any())).thenReturn(List.of(latest, older, another));
        when(appUserDao.selectById(8L)).thenReturn(openUser(8L, 28, "320100"));
        when(appUserDao.selectById(9L)).thenReturn(openUser(9L, 29, "320100"));
        when(accessProjectionService.project(any(AppUser.class))).thenReturn("OPEN");
        PublicProfileVO first = new PublicProfileVO();
        first.setUserId(8L);
        PublicProfileVO second = new PublicProfileVO();
        second.setUserId(9L);
        when(publicProfileService.getPublicProfile(7L, 8L)).thenReturn(first);
        when(publicProfileService.getPublicProfile(7L, 9L)).thenReturn(second);

        RecommendReplayPageVO result = service.getReplay(7L);

        assertThat(result.getItems()).hasSize(2);
        assertThat(result.getItems().get(0).getLastAction()).isEqualTo("skip");
        assertThat(result.getItems().get(0).getDateGroup()).isEqualTo("今天");
        assertThat(result.getItems().get(1).getDateGroup()).isEqualTo("昨天");
    }

    private AppUser openUser(Long id, int age, String city) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setAge(age);
        user.setLocationCity(city);
        user.setGender("MALE");
        return user;
    }

    private AccessStatusVO browsableAccess() {
        AccessStatusVO access = new AccessStatusVO();
        access.setCanBrowseCards(true);
        access.setCoreAccessStatus("NON_CORE_ONLY");
        access.setBlockReasons(List.of("请完成实名、头像、学历三重认证后继续使用"));
        return access;
    }

    private RecommendPreferenceSaveReq basicRequest(int version) {
        RecommendPreferenceSaveReq req = new RecommendPreferenceSaveReq();
        req.setVersion(version);
        req.setTargetCityCodes(List.of("320100"));
        req.setAllowNeighborCity(false);
        req.setMinAge(24);
        req.setMaxAge(34);
        return req;
    }

    private RecommendPreference basicPreference(Long userId, int version) {
        RecommendPreference preference = new RecommendPreference();
        preference.setUserId(userId);
        preference.setVersion(version);
        preference.setTargetCityCodes("[\"320100\"]");
        preference.setAllowNeighborCity(0);
        preference.setMinAge(24);
        preference.setMaxAge(34);
        preference.setEducationCodes("[]");
        preference.setHometowns("[]");
        preference.setSchoolCodes("[]");
        preference.setMajorNames("[]");
        return preference;
    }

    private AppConfig config(String key, String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        return config;
    }

    private RecommendViewLog viewLog(Long userId, Long targetId, String action, LocalDateTime viewedAt) {
        RecommendViewLog log = new RecommendViewLog();
        log.setUserId(userId);
        log.setCandidateUserId(targetId);
        log.setAction(action);
        log.setViewedAt(viewedAt);
        return log;
    }

    private VipBenefitVO benefit(String code) {
        VipBenefitVO benefit = new VipBenefitVO();
        benefit.setBenefitCode(code);
        return benefit;
    }
}
