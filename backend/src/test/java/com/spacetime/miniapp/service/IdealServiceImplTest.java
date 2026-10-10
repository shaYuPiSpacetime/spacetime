package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.IdealSearchReq;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.IdealPricingVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;
import com.spacetime.miniapp.service.impl.IdealServiceImpl;
import com.spacetime.miniapp.service.impl.Prd01AccessEvaluator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalDate;
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
    @Mock private DictDataDao dictDataDao;
    @Mock private SchoolDictionaryDao schoolDictionaryDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private MiniappPublicProfileService publicProfileService;
    @Mock private IdealUnlockService idealUnlockService;
    @Mock private Prd01AccessEvaluator accessEvaluator;

    @InjectMocks private IdealServiceImpl service;

    @Test
    void searchShouldBatchBlockChecksInsteadOfQueryingEachCandidate() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        List<AppUser> candidates = LongStream.range(100, 200)
                .mapToObj(id -> openUser(id, "FEMALE", 28, "320100")).toList();
        prepareSearch(current, candidates);

        assertThat(service.search(7L, searchReq(List.of())).getResultCount()).isEqualTo(100);
        verify(relationBlockDao).selectActiveBetweenUserAndTargets(
                org.mockito.ArgumentMatchers.eq(7L), any(), any());
        verify(relationBlockDao, never()).selectActive(any(), any(), any());
    }

    @Test
    void batchedBlockChecksKeepBlacklistBidirectionalAndNoRecommendOutgoingOnly() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        List<AppUser> candidates = LongStream.range(100, 104)
                .mapToObj(id -> openUser(id, "FEMALE", 28, "320100")).toList();
        prepareSearch(current, candidates);
        List<AppUserRelationBlock> blocks = new java.util.ArrayList<>();
        for (int i = 0; i < 4; i++) {
            AppUserRelationBlock block = new AppUserRelationBlock();
            block.setUserId(i % 2 == 0 ? 7L : 100L + i);
            block.setTargetUserId(i % 2 == 0 ? 100L + i : 7L);
            block.setBlockType(i < 2 ? "BLACKLIST" : "NO_RECOMMEND");
            blocks.add(block);
        }
        when(relationBlockDao.selectActiveBetweenUserAndTargets(any(), any(), any())).thenReturn(blocks);

        assertThat(service.search(7L, searchReq(List.of())).getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> rows = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(rows.capture());
        assertThat(rows.getValue()).singleElement()
                .satisfies(item -> assertThat(item.getCandidateUserId()).isEqualTo(103L));
    }

    @Test
    void legacyImportedCommaTagsShouldEnableAndMatchInterestAndLoveConditions() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setTags("reading,love_ritual");
        AppUser candidate = openUser(8L, "FEMALE", 28, "320100");
        candidate.setTags("reading,love_ritual");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(10L, 0L, "HOBBY", "兴趣"), tag(11L, 10L, "reading", "阅读爱好"),
                tag(20L, 0L, "LOVE", "爱情"), tag(21L, 20L, "love_ritual", "注重仪式感")));
        prepareSearch(current, List.of(candidate));

        assertThat(service.search(7L, searchReq(List.of(
                "M08-IDEAL-interest-similar", "M08-IDEAL-view-compatible"))).getResultCount())
                .isEqualTo(1);
    }

    @ParameterizedTest
    @CsvSource({
            "M08-IDEAL-overseas,有留学经历", "M08-IDEAL-home-owner,已购房",
            "M08-IDEAL-car-owner,已购车", "M08-IDEAL-only-child,独生子女",
            "M08-IDEAL-public-family,体制内家庭", "M08-IDEAL-sports,有健身习惯",
            "M08-IDEAL-animals,喜欢小动物", "M08-IDEAL-food,热爱一切美食", "M08-IDEAL-travel,喜欢旅行",
            "M08-IDEAL-travel,旅行收藏"
    })
    void adminDefinedTagCodesShouldMatchOnlyTheirSelectedSemanticCondition(String condition, String label) {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser matched = openUser(8L, "FEMALE", 28, "320100");
        matched.setTags("[\"operator-defined-tag\"]");
        AppUser unmatched = openUser(9L, "FEMALE", 28, "320100");
        unmatched.setTags("[]");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(30L, 0L, "recommedation", "推荐"), tag(31L, 30L, "operator-defined-tag", label)));
        prepareSearch(current, List.of(matched, unmatched));
        assertThat(service.search(7L, searchReq(List.of(condition))).getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> rows = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(rows.capture());
        assertThat(rows.getValue()).extracting(IdealSnapshotCandidate::getCandidateUserId).containsExactly(8L);
    }

    @ParameterizedTest
    @CsvSource({"true,false,1", "false,false,0", "true,true,0"})
    void importedTravelCollectionShouldRespectEnabledDictionaryAndOtherConditions(
            boolean enabled, boolean requireHeight, int expected) {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser traveler = openUser(8L, "FEMALE", 28, "320100");
        traveler.setTags("import-travel,other-tag");
        traveler.setHeight(160);
        AppUser collector = openUser(9L, "FEMALE", 28, "320100");
        collector.setTags("[\"other-tag\"]");
        collector.setHeight(170);
        List<SysDictData> dictionary = new java.util.ArrayList<>(List.of(
                tag(10L, 0L, "HOBBY", "兴趣"), tag(11L, 10L, "other-tag", "普通收藏")));
        if (enabled) {
            dictionary.add(tag(12L, 10L, "import-travel", "旅行收藏"));
        }
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(dictionary);
        prepareSearch(current, List.of(traveler, collector));

        List<String> conditions = requireHeight
                ? List.of("M08-IDEAL-travel", "M08-IDEAL-height-165")
                : List.of("M08-IDEAL-travel");
        assertThat(service.search(7L, searchReq(conditions)).getResultCount()).isEqualTo(expected);
        if (expected == 1) {
            ArgumentCaptor<List<IdealSnapshotCandidate>> rows = ArgumentCaptor.forClass(List.class);
            verify(snapshotCandidateDao).insertBatch(rows.capture());
            assertThat(rows.getValue()).extracting(IdealSnapshotCandidate::getCandidateUserId)
                    .containsExactly(8L);
        } else {
            verify(snapshotCandidateDao, never()).insertBatch(any());
        }
    }

    @Test
    void twoYearMarriageConditionShouldUseSavedGoalAndRejectOtherGoals() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser matched = openUser(8L, "FEMALE", 28, "320100");
        matched.setDatingGoal("ONE_TO_TWO_YEARS");
        AppUser unmatched = openUser(9L, "FEMALE", 28, "320100");
        unmatched.setDatingGoal("DATE_NOT_MARRY");
        prepareSearch(current, List.of(matched, unmatched));
        assertThat(service.search(7L, searchReq(List.of("M08-IDEAL-marry-2y"))).getResultCount()).isEqualTo(1);
    }

    @Test
    void completedBasicProfileShouldAllowIdealBrowsingWithoutInteractionCertification() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("CLOSED");
        AccessStatusVO access = new AccessStatusVO();
        access.setCanBrowseCards(true);
        org.mockito.Mockito.lenient().when(accessEvaluator.evaluate(current)).thenReturn(access);

        assertThat(service.getMeta(7L).getConditions()).isNotEmpty();
    }

    @Test
    void sameLabelLoveTagsAcrossAdminGroupsShouldEnableAndMatchCompatibility() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setTags("[\"recommedation_注重仪式感\"]");
        AppUser candidate = openUser(8L, "FEMALE", 28, "320100");
        candidate.setTags("[\"love_注重仪式感\"]");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(20L, 0L, "lovetag", "恋爱"), tag(30L, 0L, "recommedation", "推荐"),
                tag(21L, 20L, "love_注重仪式感", "注重仪式感"),
                tag(31L, 30L, "recommedation_注重仪式感", "注重仪式感")));
        prepareSearch(current, List.of(candidate));

        assertThat(service.getMeta(7L).getConditions())
                .filteredOn(item -> "M08-IDEAL-view-compatible".equals(item.getCode()))
                .singleElement().satisfies(item -> assertThat(item.getAvailable()).isTrue());
        assertThat(service.search(7L, searchReq(List.of("M08-IDEAL-view-compatible"))).getResultCount())
                .isEqualTo(1);
    }

    @Test
    void enabledAdminSemanticTagsShouldApplyAllSelectedConditions() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser matched = openUser(8L, "FEMALE", 28, "320100");
        matched.setTags("[\"recommedation_已购房\",\"recommedation_已购车\"]");
        AppUser incomplete = openUser(9L, "FEMALE", 28, "320100");
        incomplete.setTags("[\"recommedation_已购房\"]");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(30L, 0L, "recommedation", "推荐"),
                tag(31L, 30L, "recommedation_已购房", "已购房"),
                tag(32L, 30L, "recommedation_已购车", "已购车")));
        prepareSearch(current, List.of(matched, incomplete));

        assertThat(service.search(7L, searchReq(List.of("M08-IDEAL-home-owner", "M08-IDEAL-car-owner")))
                .getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> rows = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(rows.capture());
        assertThat(rows.getValue()).extracting(IdealSnapshotCandidate::getCandidateUserId).containsExactly(8L);
    }

    @Test
    void idealShouldUseBirthdayInsteadOfStaleAgeAndNeverExpandCities() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser stale = openUser(8L, "FEMALE", 50, "320100");
        stale.setBirthday(LocalDate.now().minusYears(28));
        AppUser neighbor = openUser(9L, "FEMALE", 28, "320200");
        prepareSearch(current, List.of(stale, neighbor));

        assertThat(service.search(7L, searchReq(List.of())).getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> rows = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(rows.capture());
        assertThat(rows.getValue()).extracting(IdealSnapshotCandidate::getCandidateUserId).containsExactly(8L);
    }

    private void prepareSearch(AppUser current, List<AppUser> candidates) {
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(candidates);
        Map<Long, String> projection = new java.util.HashMap<>();
        candidates.forEach(candidate -> projection.put(candidate.getId(), "OPEN"));
        when(accessProjectionService.projectAll(candidates)).thenReturn(projection);
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());
    }

    @Test
    void metaOffersSchoolTierAndDisablesAlumniWithoutOwnSchoolCode() {
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
                    assertThat(item.getAvailable()).isTrue();
                    assertThat(item.getDisabledReason()).isNull();
                });
        assertThat(result.getConditions())
                .filteredOn(item -> "M08-IDEAL-alumni".equals(item.getCode()))
                .singleElement()
                .satisfies(item -> assertThat(item.getAvailable()).isFalse());
        assertThat(result.getPreferenceVersion()).isEqualTo(2);
        assertThat(result.getTargetCities()).singleElement()
                .satisfies(city -> assertThat(city.getName()).isEqualTo("南京"));
        assertThat(result.getOverseasAddressAvailable()).isFalse();
        assertThat(result.getOverseasAddressDisabledReason()).contains("海外地区字典");
    }

    @Test
    void alumniBecomesAvailableWhenOwnSchoolHasStableCode() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setSchoolCode("school-001");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));

        IdealMetaVO result = service.getMeta(7L);

        assertThat(result.getConditions())
                .filteredOn(item -> "M08-IDEAL-alumni".equals(item.getCode()))
                .singleElement()
                .satisfies(item -> assertThat(item.getAvailable()).isTrue());
    }

    @Test
    void schoolTierMatchesDictionaryFlagsButNeverGuessesFromFreeText() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser classified = openUser(8L, "FEMALE", 28, "320100");
        classified.setSchoolCode("school-001");
        AppUser freeText = openUser(9L, "FEMALE", 27, "320100");
        freeText.setSchool("某985大学");
        SchoolDictionary school = new SchoolDictionary();
        school.setSchoolCode("school-001");
        school.setIs211(true);
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(List.of(classified, freeText));
        when(accessProjectionService.projectAll(List.of(classified, freeText)))
                .thenReturn(Map.of(8L, "OPEN", 9L, "OPEN"));
        when(schoolDictionaryDao.selectByCodes(List.of("school-001"))).thenReturn(List.of(school));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(List.of("M08-IDEAL-school-tier")));

        assertThat(result.getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(captor.capture());
        assertThat(captor.getValue()).singleElement()
                .satisfies(item -> assertThat(item.getCandidateUserId()).isEqualTo(8L));
        verify(schoolDictionaryDao).selectByCodes(List.of("school-001"));
    }

    @Test
    void alumniMatchesEqualStableSchoolCodesOnly() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setSchoolCode("school-001");
        AppUser classmate = openUser(8L, "FEMALE", 28, "320100");
        classmate.setSchoolCode("school-001");
        AppUser sameNameWithoutCode = openUser(9L, "FEMALE", 27, "320100");
        sameNameWithoutCode.setSchool("同名大学");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(List.of(classmate, sameNameWithoutCode));
        when(accessProjectionService.projectAll(List.of(classmate, sameNameWithoutCode)))
                .thenReturn(Map.of(8L, "OPEN", 9L, "OPEN"));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(List.of("M08-IDEAL-alumni")));

        assertThat(result.getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(captor.capture());
        assertThat(captor.getValue()).singleElement()
                .satisfies(item -> assertThat(item.getCandidateUserId()).isEqualTo(8L));
    }

    @Test
    void newAdminInterestAndLoveTagsParticipateInSimilarity() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setTags("[\"NEW_INTEREST\",\"NEW_LOVE\"]");
        AppUser candidate = openUser(8L, "FEMALE", 28, "320100");
        candidate.setTags("[\"NEW_INTEREST\",\"NEW_LOVE\"]");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(10L, 0L, "HOBBY", "兴趣"),
                tag(20L, 0L, "LOVE", "爱情"),
                tag(11L, 10L, "NEW_INTEREST", "新兴趣"),
                tag(21L, 20L, "NEW_LOVE", "新爱情观")));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(List.of(candidate));
        when(accessProjectionService.projectAll(List.of(candidate))).thenReturn(Map.of(8L, "OPEN"));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealMetaVO meta = service.getMeta(7L);
        assertThat(meta.getConditions())
                .filteredOn(item -> "M08-IDEAL-interest-similar".equals(item.getCode())
                        || "M08-IDEAL-view-compatible".equals(item.getCode()))
                .allSatisfy(item -> assertThat(item.getAvailable()).isTrue());

        IdealSearchVO result = service.search(7L, searchReq(List.of(
                "M08-IDEAL-interest-similar", "M08-IDEAL-view-compatible")));

        assertThat(result.getResultCount()).isEqualTo(1);
    }

    @Test
    void disabledLegacyTagDoesNotEnableSimilarityWhenDictionaryExists() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        current.setTags("[\"FOODIE\"]");
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                tag(10L, 0L, "HOBBY", "兴趣"),
                tag(11L, 10L, "NEW_INTEREST", "新兴趣")));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));

        IdealMetaVO meta = service.getMeta(7L);

        assertThat(meta.getConditions())
                .filteredOn(item -> "M08-IDEAL-interest-similar".equals(item.getCode()))
                .singleElement()
                .satisfies(item -> assertThat(item.getAvailable()).isFalse());
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
    void sportsConditionIncludesOutdoorTagConfiguredUnderSportsCategory() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser candidate = openUser(8L, "FEMALE", 28, "320100");
        candidate.setHeight(170);
        candidate.setTags("[\"OUTDOOR_LOVER\"]");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(List.of(candidate));
        when(accessProjectionService.projectAll(List.of(candidate)))
                .thenReturn(Map.of(8L, "OPEN"));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(
                List.of("M08-IDEAL-height-165", "M08-IDEAL-sports")));

        assertThat(result.getResultCount()).isEqualTo(1);
        verify(snapshotCandidateDao).insertBatch(any());
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

    @ParameterizedTest
    @CsvSource({"0,25,28岁", "1,25,27岁", "-1,25,28岁", ",28,28岁", ",,年龄保密"})
    void lockedResultShowsCurrentAgeWithoutReturningIdentity(Integer birthdayOffset, Integer savedAge, String expectedAge) {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser target = openUser(8L, "FEMALE", 28, "320100");
        target.setBirthday(birthdayOffset == null ? null
                : LocalDate.now(java.time.ZoneId.of("Asia/Shanghai")).minusYears(28).plusDays(birthdayOffset));
        target.setAge(savedAge);
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
            assertThat(locked.getAgeBand()).isEqualTo(expectedAge);
            assertThat(locked.getCityName()).isEqualTo("南京");
            assertThat(locked.getEducationLabel()).isEqualTo("硕士");
            assertThat(locked.getSchoolSummary()).isEqualTo("学校信息解锁后可见");
        });
        assertThat(result.getPricing()).isSameAs(pricing);
        verify(publicProfileService, never()).getPublicProfile(any(), any());
    }

    @Test
    void resultOmitsPreviouslyUnlockedUserFromAnotherSnapshot() {
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
        when(idealUnlockService.getPricing()).thenReturn(new IdealPricingVO());

        IdealResultPageVO result = service.getResults(7L, "IDS-001", null);

        assertThat(result.getItems()).isEmpty();
        assertThat(result.getResultCount()).isZero();
        assertThat(result.getUnlockableCount()).isZero();
        verify(publicProfileService, never()).getPublicProfile(any(), any());
    }

    @Test
    void searchExcludesPreviouslyUnlockedUserFromNewSnapshot() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        AppUser unlocked = openUser(8L, "FEMALE", 28, "320100");
        unlocked.setHeight(168);
        AppUser fresh = openUser(9L, "FEMALE", 29, "320100");
        fresh.setHeight(169);
        com.spacetime.common.entity.UserUnlockRecord record = new com.spacetime.common.entity.UserUnlockRecord();
        record.setTargetUserId(8L);
        record.setStatus("active");
        record.setActiveMarker(1);
        record.setExpireTime(LocalDateTime.now().plusDays(1));
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(preferenceDao.selectByUserId(7L)).thenReturn(preference(7L, 2));
        when(appUserDao.selectList(any())).thenReturn(List.of(unlocked, fresh));
        when(accessProjectionService.projectAll(List.of(unlocked, fresh)))
                .thenReturn(Map.of(8L, "OPEN", 9L, "OPEN"));
        when(unlockRecordDao.selectList(any())).thenReturn(List.of(record));
        org.mockito.Mockito.doAnswer(invocation -> {
            IdealFilterSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(100L);
            return null;
        }).when(snapshotDao).insert(any());

        IdealSearchVO result = service.search(7L, searchReq(List.of("M08-IDEAL-height-165")));

        assertThat(result.getResultCount()).isEqualTo(1);
        ArgumentCaptor<List<IdealSnapshotCandidate>> captor = ArgumentCaptor.forClass(List.class);
        verify(snapshotCandidateDao).insertBatch(captor.capture());
        assertThat(captor.getValue()).singleElement()
                .satisfies(item -> assertThat(item.getCandidateUserId()).isEqualTo(9L));
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
    void unlockingFirstPageItemDoesNotSkipCandidatesOnNextPage() {
        AppUser current = openUser(7L, "MALE", 30, "320100");
        IdealFilterSnapshot snapshot = snapshot(100L, 7L, LocalDateTime.now().plusDays(1));
        snapshot.setResultCount(22);
        List<IdealSnapshotCandidate> candidates = LongStream.rangeClosed(8, 29)
                .mapToObj(userId -> {
                    IdealSnapshotCandidate row = candidate(100L, "IDI-" + userId, userId, "[]");
                    row.setSortTime(LocalDateTime.of(2026, 9, 30, 12, 0));
                    row.setSortTieBreaker(String.format("%020d", userId));
                    return row;
                })
                .toList();
        com.spacetime.common.entity.UserUnlockRecord unlock = new com.spacetime.common.entity.UserUnlockRecord();
        unlock.setStatus("active");
        unlock.setActiveMarker(1);
        unlock.setExpireTime(LocalDateTime.now().plusDays(1));
        when(appUserDao.selectById(any())).thenAnswer(invocation -> {
            long userId = invocation.getArgument(0);
            return userId == 7L ? current : openUser(userId, "FEMALE", 28, "320100");
        });
        when(accessProjectionService.project(any())).thenReturn("OPEN");
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        when(snapshotCandidateDao.selectBySnapshotId(100L)).thenReturn(candidates);
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(null, unlock);
        when(idealUnlockService.getPricing()).thenReturn(new IdealPricingVO());

        IdealResultPageVO first = service.getResults(7L, "IDS-001", null);
        IdealResultPageVO second = service.getResults(7L, "IDS-001", first.getNextCursor());

        assertThat(first.getItems()).hasSize(20);
        assertThat(first.getNextCursor()).isNotBlank();
        assertThat(second.getItems()).hasSize(2);
        assertThat(second.getItems()).extracting(item -> item.getItemNo())
                .containsExactly("IDI-28", "IDI-29");
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

    private SysDictData tag(Long id, Long parentId, String code, String label) {
        SysDictData data = new SysDictData();
        data.setId(id);
        data.setParentId(parentId);
        data.setDictValue(code);
        data.setDictLabel(label);
        return data;
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
