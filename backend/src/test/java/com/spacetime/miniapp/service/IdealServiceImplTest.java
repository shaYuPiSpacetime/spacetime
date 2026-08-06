package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.IdealSearchReq;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.IdealPricingVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;
import com.spacetime.miniapp.service.impl.IdealServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** PRD-08 理想型筛选、快照与隐私结果服务测试。 */
@ExtendWith(MockitoExtension.class)
class IdealServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private RecommendPreferenceDao preferenceDao;
    @Mock private IdealFilterSnapshotDao snapshotDao;
    @Mock private IdealSnapshotCandidateDao snapshotCandidateDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private MiniappPublicProfileService publicProfileService;
    @Mock private IdealUnlockService idealUnlockService;

    @InjectMocks private IdealServiceImpl service;

    @Test
    void metaReturnsExactlySeventeenConditionsAndDisablesMissingStructuredSchool() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");

        IdealMetaVO result = service.getMeta(7L);

        assertThat(result.getConditions()).hasSize(17);
        assertThat(result.getConditions())
                .filteredOn(item -> "M08-IDEAL-school-tier".equals(item.getCode()))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.getAvailable()).isFalse();
                    assertThat(item.getDisabledReason()).contains("学校结构化数据");
                });
        assertThat(result.getPreferenceVersion()).isEqualTo(2);
        assertThat(result.getTargetCities()).singleElement()
                .satisfies(city -> assertThat(city.getName()).isEqualTo("南京"));
        assertThat(result.getOverseasAddressAvailable()).isFalse();
        assertThat(result.getOverseasAddressDisabledReason()).contains("海外地区字典");
    }

    @Test
    void searchUsesAndSemanticsAndCreatesImmutableCandidateSnapshot() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser matched = openUser(8L, "FEMALE", 28, "320100");
        matched.setHeight(170);
        matched.setEducationLevel("DOCTOR");
        matched.setLastLoginTime(LocalDateTime.of(2026, 8, 5, 21, 0));
        AppUser tooShort = openUser(9L, "FEMALE", 27, "320100");
        tooShort.setHeight(160);
        tooShort.setEducationLevel("DOCTOR");
        tooShort.setLastLoginTime(LocalDateTime.of(2026, 8, 5, 20, 0));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(snapshotDao.selectByUserAndRequestId(7L, "search-001")).thenReturn(null);
        when(appUserDao.selectList(any())).thenReturn(List.of(matched, tooShort));
        when(accessProjectionService.projectAll(List.of(matched, tooShort)))
                .thenReturn(Map.of(8L, "OPEN", 9L, "OPEN"));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(
                List.of("M08-IDEAL-height-165", "M08-IDEAL-doctor")));

        assertThat(result.getResultCount()).isEqualTo(1);
        assertThat(result.getSnapshotNo()).startsWith("IDS-");
        ArgumentCaptor<List<IdealSnapshotCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(captor.capture());
        assertThat(captor.getValue()).singleElement()
                .satisfies(item -> {
                    assertThat(item.getCandidateUserId()).isEqualTo(8L);
                    assertThat(item.getMatchedConditionCodes())
                            .contains("M08-IDEAL-height-165", "M08-IDEAL-doctor");
                });
    }

    @Test
    void localConditionDoesNotTreatTemporaryCurrentCityAsHometown() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser nonLocal = openUser(8L, "FEMALE", 28, "320100");
        nonLocal.setHometownCity("110100");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(snapshotDao.selectByUserAndRequestId(7L, "search-001")).thenReturn(null);
        when(appUserDao.selectList(any())).thenReturn(List.of(nonLocal));
        when(accessProjectionService.projectAll(List.of(nonLocal))).thenReturn(Map.of(8L, "OPEN"));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(List.of("M08-IDEAL-local")));

        assertThat(result.getResultCount()).isZero();
        verify(snapshotCandidateDao, never()).insertBatch(any());
    }

    @Test
    void rejectsDependentConditionWhenCurrentProfileCannotDetermineIt() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setTags("[]");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));

        assertThatThrownBy(() -> service.search(7L,
                searchReq(List.of("M08-IDEAL-interest-similar"))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("先完善对应资料");
        verify(snapshotDao, never()).insert(any());
    }

    @Test
    void lockedResultNeverReturnsCandidateIdentityOrPublicProfile() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser target = openUser(8L, "FEMALE", 28, "320100");
        target.setEducationLevel("MASTER");
        IdealFilterSnapshot snapshot = snapshot(100L, 7L, LocalDateTime.now().plusDays(1));
        IdealSnapshotCandidate item = candidate(100L, "IDI-001", 8L,
                "[\"M08-IDEAL-height-165\"]");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        when(snapshotCandidateDao.selectBySnapshotId(100L)).thenReturn(List.of(item));
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");
        when(profileDictionaryService.label("app_education_level", "MASTER")).thenReturn("硕士");
        IdealPricingVO pricing = new IdealPricingVO();
        pricing.setUnitPrice(7);
        when(idealUnlockService.getPricing()).thenReturn(pricing);

        IdealResultPageVO result = service.getResults(7L, "IDS-001", null);

        assertThat(result.getItems()).singleElement().satisfies(locked -> {
            assertThat(locked.getUnlocked()).isFalse();
            assertThat(locked.getCandidateNo()).isNull();
            assertThat(locked.getProfile()).isNull();
            assertThat(locked.getBlurAvatarUrl()).contains("avatar-liked-blurred");
            assertThat(locked.getAgeBand()).isEqualTo("25-29岁");
            assertThat(locked.getCityName()).isEqualTo("南京");
            assertThat(locked.getEducationLabel()).isEqualTo("硕士");
            assertThat(locked.getSchoolSummary()).isEqualTo("学校信息解锁后可见");
        });
        assertThat(result.getPricing()).isSameAs(pricing);
        verify(publicProfileService, never()).getPublicProfile(any(), any());
    }

    @Test
    void resultRecognizesActiveUnlockFromAnotherSnapshotByTargetUser() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser target = openUser(8L, "FEMALE", 28, "320100");
        IdealFilterSnapshot snapshot = snapshot(100L, 7L, LocalDateTime.now().plusDays(1));
        IdealSnapshotCandidate item = candidate(100L, "IDI-NEW", 8L,
                "[\"M08-IDEAL-height-165\"]");
        com.spacetime.common.entity.UserUnlockRecord unlock = new com.spacetime.common.entity.UserUnlockRecord();
        unlock.setUserId(7L);
        unlock.setTargetUserId(8L);
        unlock.setTargetBizType("ideal");
        unlock.setTargetBizNo("8");
        unlock.setSnapshotNo("IDS-OLD");
        unlock.setSnapshotItemNo("IDI-OLD");
        unlock.setStatus("active");
        unlock.setActiveMarker(1);
        unlock.setExpireTime(LocalDateTime.now().plusDays(30));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        when(snapshotCandidateDao.selectBySnapshotId(100L)).thenReturn(List.of(item));
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(unlock);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        com.spacetime.miniapp.dto.response.PublicProfileVO profile = new com.spacetime.miniapp.dto.response.PublicProfileVO();
        profile.setUserId(8L);
        when(publicProfileService.getPublicProfile(7L, 8L)).thenReturn(profile);
        when(idealUnlockService.getPricing()).thenReturn(new IdealPricingVO());

        IdealResultPageVO result = service.getResults(7L, "IDS-001", null);

        assertThat(result.getItems()).singleElement().satisfies(unlocked -> {
            assertThat(unlocked.getUnlocked()).isTrue();
            assertThat(unlocked.getCommunicationMode()).isEqualTo("PRIVATE_MESSAGE");
            assertThat(unlocked.getProfile()).isSameAs(profile);
        });
        assertThat(result.getUnlockableCount()).isZero();
    }

    @Test
    void unlockableCountCoversWholeSnapshotInsteadOfOnlyCurrentPage() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        IdealFilterSnapshot snapshot = snapshot(100L, 7L, LocalDateTime.now().plusDays(1));
        snapshot.setResultCount(21);
        List<IdealSnapshotCandidate> candidates = LongStream.rangeClosed(8, 28)
                .mapToObj(userId -> candidate(100L, "IDI-" + userId, userId, "[]"))
                .toList();
        when(appUserDao.selectById(any())).thenAnswer(invocation -> {
            long userId = invocation.getArgument(0);
            return userId == 7L ? current : openUser(userId, "FEMALE", 28, "320100");
        });
        when(accessProjectionService.project(any())).thenReturn("OPEN");
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        when(snapshotCandidateDao.selectBySnapshotId(100L)).thenReturn(candidates);
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");
        when(idealUnlockService.getPricing()).thenReturn(new IdealPricingVO());

        IdealResultPageVO result = service.getResults(7L, "IDS-001", null);

        assertThat(result.getItems()).hasSize(20);
        assertThat(result.getUnlockableCount()).isEqualTo(21);
        assertThat(result.getNextCursor()).isNotBlank();
    }

    @Test
    void metaReturnsLatestConditionsAndCappedHistoryCountFromSnapshots() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");
        IdealFilterSnapshot latest = snapshot(100L, 7L, LocalDateTime.now().plusDays(1));
        latest.setConditionCodes("[\"M08-IDEAL-height-165\",\"M08-IDEAL-doctor\"]");
        Page<IdealFilterSnapshot> page = new Page<>(1, 1, 28);
        page.setRecords(List.of(latest));
        when(snapshotDao.selectPage(any(), any())).thenReturn(page);

        IdealMetaVO result = service.getMeta(7L);

        assertThat(result.getLastConditionCodes())
                .containsExactly("M08-IDEAL-height-165", "M08-IDEAL-doctor");
        assertThat(result.getHistoryCount()).isEqualTo(20);
    }

    @Test
    void expiredSnapshotCannotReturnCandidates() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(snapshotDao.selectBySnapshotNo("IDS-EXPIRED"))
                .thenReturn(snapshot(100L, 7L, LocalDateTime.now().minusSeconds(1)));

        assertThatThrownBy(() -> service.getResults(7L, "IDS-EXPIRED", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("筛选记录已过期");
        verify(snapshotCandidateDao, never()).selectBySnapshotId(any());
    }

    @Test
    void idempotentDigestIsStableWhenEquivalentCityOrderChanges() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        RecommendPreference preference = preference(7L, 2);
        preference.setTargetCityCodes("[\"320100\",\"110100\"]");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference);
        when(appUserDao.selectList(any())).thenReturn(List.of());
        AtomicReference<IdealFilterSnapshot> inserted = new AtomicReference<>();
        when(snapshotDao.selectByUserAndRequestId(7L, "search-001"))
                .thenAnswer(invocation -> inserted.get());
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            inserted.set(snapshot);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchReq first = searchReq(List.of("M08-IDEAL-height-165"));
        first.setTargetCityCodes(List.of("320100", "110100"));
        IdealSearchReq retry = searchReq(List.of("M08-IDEAL-height-165"));
        retry.setTargetCityCodes(List.of("110100", "320100"));

        IdealSearchVO created = service.search(7L, first);
        IdealSearchVO replayed = service.search(7L, retry);

        assertThat(replayed.getSnapshotNo()).isEqualTo(created.getSnapshotNo());
        verify(snapshotDao, org.mockito.Mockito.times(1)).insert(any());
    }

    private IdealSearchReq searchReq(List<String> conditions) {
        IdealSearchReq req = new IdealSearchReq();
        req.setRequestId("search-001");
        req.setPreferenceVersion(2);
        req.setTargetCityCodes(List.of("320100"));
        req.setMinAge(24);
        req.setMaxAge(34);
        req.setConditionCodes(conditions);
        return req;
    }

    private RecommendPreference preference(Long userId, int version) {
        RecommendPreference preference = new RecommendPreference();
        preference.setUserId(userId);
        preference.setVersion(version);
        preference.setTargetCityCodes("[\"320100\"]");
        preference.setAllowNeighborCity(0);
        preference.setMinAge(24);
        preference.setMaxAge(34);
        return preference;
    }

    private AppUser openUser(Long id, String gender, int age, String city) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setGender(gender);
        user.setAge(age);
        user.setLocationCity(city);
        return user;
    }

    private IdealFilterSnapshot snapshot(Long id, Long userId, LocalDateTime expiresAt) {
        IdealFilterSnapshot snapshot = new IdealFilterSnapshot();
        snapshot.setId(id);
        snapshot.setSnapshotNo("IDS-001");
        snapshot.setUserId(userId);
        snapshot.setPreferenceVersion(2);
        snapshot.setTargetCityCodes("[\"320100\"]");
        snapshot.setMinAge(24);
        snapshot.setMaxAge(34);
        snapshot.setConditionCodes("[\"M08-IDEAL-height-165\"]");
        snapshot.setConditionPayload("[]");
        snapshot.setStatus("active");
        snapshot.setExpiresAt(expiresAt);
        snapshot.setResultCount(1);
        return snapshot;
    }

    private IdealSnapshotCandidate candidate(Long snapshotId, String itemNo, Long userId, String conditions) {
        IdealSnapshotCandidate item = new IdealSnapshotCandidate();
        item.setSnapshotId(snapshotId);
        item.setItemNo(itemNo);
        item.setCandidateUserId(userId);
        item.setMatchedConditionCodes(conditions);
        item.setSortTime(LocalDateTime.now());
        item.setSortTieBreaker(String.valueOf(userId));
        return item;
    }
}
