package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.response.IdealHelpVO;
import com.spacetime.miniapp.dto.response.IdealPricingVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordPageVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.impl.IdealHistoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** PRD-08 理想型筛选记录、解锁记录和帮助中心测试。 */
@ExtendWith(MockitoExtension.class)
class IdealHistoryServiceImplTest {
    @Mock private IdealFilterSnapshotDao snapshotDao;
    @Mock private IdealSnapshotCandidateDao snapshotCandidateDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private MiniappPublicProfileService publicProfileService;
    @Mock private IdealUnlockService idealUnlockService;

    @InjectMocks private IdealHistoryServiceImpl service;

    @Test
    void searchRecordsReturnImmutableSummaryAndLimitHistoryToTwenty() {
        givenCurrentUserOpen();
        IdealFilterSnapshot snapshot = snapshot();
        Page<IdealFilterSnapshot> page = new Page<>(1, 10, 25);
        page.setRecords(List.of(snapshot));
        when(snapshotDao.selectPage(any(), any())).thenReturn(page);
        when(profileDictionaryService.label("china_region", "320100")).thenReturn("南京");

        IdealSearchRecordPageVO result = service.searchRecords(7L, null);

        assertThat(result.getTotal()).isEqualTo(20);
        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getSnapshotNo()).isEqualTo("IDS-001");
            assertThat(item.getSummary().getConditionNames()).containsExactly("身高165+");
            assertThat(item.getSummary().getTargetCities()).singleElement()
                    .satisfies(city -> assertThat(city.getName()).isEqualTo("南京"));
        });
        assertThat(result.getNextCursor()).isNotBlank();
    }

    @Test
    void activeUnlockReturnsProfileAndPrivateMessageMode() {
        givenCurrentUserOpen();
        UserUnlockRecord record = unlockRecord(LocalDateTime.now().plusDays(3), "active", 1);
        Page<UserUnlockRecord> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(record));
        when(unlockRecordDao.selectPage(any(), any())).thenReturn(page);
        AppUser target = user(8L);
        target.setEducationLevel("MASTER");
        target.setSchool("南京大学");
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(profileDictionaryService.label("app_education_level", "MASTER")).thenReturn("硕士");
        IdealFilterSnapshot snapshot = snapshot();
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        IdealSnapshotCandidate candidate = new IdealSnapshotCandidate();
        candidate.setSnapshotId(snapshot.getId());
        candidate.setItemNo("IDI-001");
        candidate.setMatchedConditionCodes("[\"M08-IDEAL-height-165\"]");
        when(snapshotCandidateDao.selectBySnapshotId(snapshot.getId())).thenReturn(List.of(candidate));
        PublicProfileVO profile = new PublicProfileVO();
        profile.setUserId(8L);
        when(publicProfileService.getPublicProfile(7L, 8L)).thenReturn(profile);

        IdealUnlockRecordPageVO result = service.unlockRecords(7L, "active", null);

        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getProfile()).isSameAs(profile);
            assertThat(item.getCommunicationMode()).isEqualTo("PRIVATE_MESSAGE");
            assertThat(item.getAvailable()).isTrue();
            assertThat(item.getEducationLabel()).isEqualTo("硕士");
            assertThat(item.getSchoolSummary()).isEqualTo("南京大学");
            assertThat(item.getMatchedConditionNames()).containsExactly("身高165+");
        });
    }

    @Test
    void inactiveUnlockNeverLeaksProfile() {
        givenCurrentUserOpen();
        UserUnlockRecord record = unlockRecord(LocalDateTime.now().minusSeconds(1), "active", 1);
        Page<UserUnlockRecord> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(record));
        when(unlockRecordDao.selectPage(any(), any())).thenReturn(page);

        IdealUnlockRecordPageVO result = service.unlockRecords(7L, "inactive", null);

        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getStatus()).isEqualTo("expired");
            assertThat(item.getProfile()).isNull();
            assertThat(item.getCommunicationMode()).isNull();
        });
        verify(publicProfileService, never()).getPublicProfile(any(), any());
    }

    @Test
    void helpCombinesDynamicCopyAndCommercialPricing() {
        givenCurrentUserOpen();
        IdealPricingVO pricing = new IdealPricingVO();
        pricing.setUnitPrice(7);
        pricing.setDiscountPercent(10);
        pricing.setBatchMax(5);
        pricing.setRetentionDays(30);
        when(idealUnlockService.getPricing()).thenReturn(pricing);
        when(appConfigDao.selectByKey("content.ideal.help.intro"))
                .thenReturn(config("自定义理想型介绍"));

        IdealHelpVO result = service.help(7L);

        assertThat(result.getTitle()).isEqualTo("什么是理想型？");
        assertThat(result.getIntro()).isEqualTo("自定义理想型介绍");
        assertThat(result.getPricing()).isSameAs(pricing);
        assertThat(result.getResultDescription())
                .contains("上不封顶")
                .contains("列表内嘉宾卡片");
        assertThat(result.getUnlockDescription())
                .contains("7千寻币/位")
                .contains("9折优惠");
    }

    private void givenCurrentUserOpen() {
        AppUser current = user(7L);
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
    }

    private AppUser user(Long id) {
        AppUser user = new AppUser();
        user.setId(id);
        return user;
    }

    private IdealFilterSnapshot snapshot() {
        IdealFilterSnapshot snapshot = new IdealFilterSnapshot();
        snapshot.setId(100L);
        snapshot.setSnapshotNo("IDS-001");
        snapshot.setUserId(7L);
        snapshot.setTargetCityCodes("[\"320100\"]");
        snapshot.setMinAge(24);
        snapshot.setMaxAge(34);
        snapshot.setConditionCodes("[\"M08-IDEAL-height-165\"]");
        snapshot.setResultCount(3);
        snapshot.setStatus("active");
        snapshot.setExpiresAt(LocalDateTime.now().plusDays(30));
        snapshot.setCreateTime(LocalDateTime.now());
        return snapshot;
    }

    private UserUnlockRecord unlockRecord(LocalDateTime expiresAt, String status, int activeMarker) {
        UserUnlockRecord record = new UserUnlockRecord();
        record.setUnlockNo("ULK-001");
        record.setUserId(7L);
        record.setTargetUserId(8L);
        record.setTargetBizType("ideal");
        record.setSnapshotNo("IDS-001");
        record.setSnapshotItemNo("IDI-001");
        record.setUnlockScene("ideal_user_unlock");
        record.setCoinCost(7);
        record.setEffectiveTime(LocalDateTime.now().minusDays(1));
        record.setExpireTime(expiresAt);
        record.setStatus(status);
        record.setActiveMarker(activeMarker);
        record.setCreateTime(LocalDateTime.now().minusDays(1));
        return record;
    }

    private AppConfig config(String value) {
        AppConfig config = new AppConfig();
        config.setConfigValue(value);
        config.setStatus("ENABLED");
        return config;
    }
}
