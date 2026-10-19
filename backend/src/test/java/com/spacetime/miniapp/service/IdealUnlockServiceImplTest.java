package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.IdealUnlockAllQuoteReq;
import com.spacetime.miniapp.dto.request.IdealUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.IdealUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.impl.IdealUnlockServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** PRD-08 理想型报价、批量折扣、扣费和解锁闭环测试。 */
@ExtendWith(MockitoExtension.class)
class IdealUnlockServiceImplTest {
    @Mock private IdealFilterSnapshotDao snapshotDao;
    @Mock private IdealSnapshotCandidateDao candidateDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private CoinSceneConfigDao sceneConfigDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private MiniappPublicProfileService publicProfileService;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Spy private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @InjectMocks private IdealUnlockServiceImpl service;
    private List<String> currentPageItemNos = List.of();

    @Test
    void unlockAllQuoteAppliesConfiguredDiscountAndRoundsPayableUp() {
        givenOpenSnapshotWithCandidates(3);
        givenCommercialConfig(5, 10);
        givenScene(7, 30);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(100));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        IdealUnlockQuoteVO result = service.quoteAll(7L, allReq());

        assertThat(result.getCandidateCount()).isEqualTo(3);
        assertThat(result.getOriginalCost()).isEqualTo(21);
        assertThat(result.getDiscountPercent()).isEqualTo(10);
        assertThat(result.getDiscountAmount()).isEqualTo(2);
        assertThat(result.getPayableCost()).isEqualTo(19);
        assertThat(result.getRetentionDays()).isEqualTo(30);
        assertThat(result.getBalanceEnough()).isTrue();
        verify(valueOperations).set(anyString(), anyString(), eq(Duration.ofMinutes(5)));
    }

    @Test
    void unlockAllOnlyQuotesCurrentPageInsteadOfEntire245CandidateSnapshot() {
        givenOpenSnapshotWithCandidates(245);
        currentPageItemNos = currentPageItemNos.subList(20, 40);
        givenCommercialConfig(2, 10);
        givenScene(7, 30);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(1000));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        IdealUnlockQuoteVO result = service.quoteAll(7L, allReq());

        assertThat(result.getCandidateCount()).isEqualTo(20);
        assertThat(result.getBatchMax()).isZero();
        assertThat(result.getOriginalCost()).isEqualTo(140);
        assertThat(result.getPayableCost()).isEqualTo(126);
        verify(candidateDao, never()).selectBySnapshotId(any());
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        assertThat(payload.getValue()).contains("IDI-0021", "IDI-0040").doesNotContain("\"IDI-001\"", "IDI-0041");
    }

    @Test
    void legacyAllQuoteWithoutPageScopeMustNotUnlockWholeSnapshot() {
        IdealUnlockAllQuoteReq req = new IdealUnlockAllQuoteReq();
        req.setSnapshotNo("IDS-001");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.quoteAll(7L, req))
                .isInstanceOf(BusinessException.class).hasMessageContaining("当前页");
        verify(candidateDao, never()).selectBySnapshotId(any());
    }

    @Test
    void selectedQuoteOnlyIncludesSelectedPeopleAndAppliesBatchDiscount() {
        givenOpenSnapshotWithCandidates(8);
        givenScene(7, 30);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(1000));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        IdealUnlockQuoteReq req = new IdealUnlockQuoteReq();
        req.setSnapshotNo("IDS-001");
        req.setItemNos(List.of("IDI-001", "IDI-003", "IDI-004", "IDI-005", "IDI-006", "IDI-008"));

        IdealUnlockQuoteVO result = service.quote(7L, req);

        assertThat(result.getCandidateCount()).isEqualTo(6);
        assertThat(result.getPayableCost()).isEqualTo(38);
        assertThat(result.getDiscountPercent()).isEqualTo(10);
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        assertThat(payload.getValue()).contains("IDI-008").doesNotContain("IDI-002", "IDI-007");
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 20, 40})
    void selectedQuoteUsesConfiguredBatchDiscountForActualPeople(int count) {
        givenOpenSnapshotWithCandidates(count);
        givenScene(10, 30);
        if (count > 1) givenCommercialConfig(0, 10);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(1000));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        IdealUnlockQuoteReq req = new IdealUnlockQuoteReq();
        req.setSnapshotNo("IDS-001");
        req.setItemNos(currentPageItemNos);

        IdealUnlockQuoteVO result = service.quote(7L, req);

        assertThat(result.getCandidateCount()).isEqualTo(count);
        assertThat(result.getDiscountPercent()).isEqualTo(count > 1 ? 10 : 0);
        assertThat(result.getPayableCost()).isEqualTo(count > 1 ? count * 9 : 10);
    }

    @Test
    void selectedBatchConfirmUsesSameDiscountAndAllocatesExactCost() {
        givenOpenSnapshotWithCandidates(20);
        givenScene(10, 30);
        givenCommercialConfig(0, 10);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(1000), asset(820));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(1000));
        when(userAssetDao.updateCoinBalance(7L, -180)).thenReturn(1);
        IdealUnlockQuoteReq selected = new IdealUnlockQuoteReq();
        selected.setSnapshotNo("IDS-001");
        selected.setItemNos(currentPageItemNos);
        IdealUnlockQuoteVO quote = service.quote(7L, selected);
        assertThat(quote.getPayableCost()).isEqualTo(180);
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        when(valueOperations.get("miniapp:ideal-unlock:quote:" + quote.getQuoteToken())).thenReturn(payload.getValue());
        IdealUnlockConfirmReq req = new IdealUnlockConfirmReq();
        req.setQuoteToken(quote.getQuoteToken());
        req.setRequestId("selected-batch-20");

        IdealUnlockConfirmVO result = service.confirm(7L, req);

        assertThat(result.getPaidCost()).isEqualTo(180);
        assertThat(result.getNewBalance()).isEqualTo(820);
        assertThat(result.getUnlockedItems()).hasSize(20);
        ArgumentCaptor<UserCoinLog> logs = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao, org.mockito.Mockito.times(20)).insert(logs.capture());
        assertThat(logs.getAllValues().stream().mapToInt(UserCoinLog::getChangeAmount).sum()).isEqualTo(-180);
    }

    @Test
    void selectedQuoteDeduplicatesAndExcludesUnlockedBeforeDeterminingDiscount() {
        givenOpenSnapshotWithCandidates(2);
        when(unlockRecordDao.selectList(any())).thenReturn(List.of(confirmedRecord(900L, "OLD-ITEM", 8L, 10)));
        givenCommercialConfig(0, 10);
        givenScene(10, 30);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(1000));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        IdealUnlockQuoteReq req = new IdealUnlockQuoteReq();
        req.setSnapshotNo("IDS-001");
        req.setItemNos(List.of("IDI-001", "IDI-002", "IDI-002"));

        IdealUnlockQuoteVO result = service.quote(7L, req);

        assertThat(result.getCandidateCount()).isEqualTo(1);
        assertThat(result.getDiscountPercent()).isZero();
        assertThat(result.getPayableCost()).isEqualTo(10);
    }

    @Test
    void selectedBatchRejectsChangedDiscountWithoutCharging() {
        givenOpenSnapshotWithCandidates(2);
        givenScene(10, 30);
        givenCommercialConfig(0, 10);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(100));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(100));
        IdealUnlockQuoteReq selected = new IdealUnlockQuoteReq();
        selected.setSnapshotNo("IDS-001");
        selected.setItemNos(currentPageItemNos);
        IdealUnlockQuoteVO quote = service.quote(7L, selected);
        assertThat(quote.getPayableCost()).isEqualTo(18);
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        when(valueOperations.get("miniapp:ideal-unlock:quote:" + quote.getQuoteToken())).thenReturn(payload.getValue());
        when(appConfigDao.selectByKey("commercial.ideal.batch.discount.percent"))
                .thenReturn(config("commercial.ideal.batch.discount.percent", "20"));
        IdealUnlockConfirmReq req = new IdealUnlockConfirmReq();
        req.setQuoteToken(quote.getQuoteToken());
        req.setRequestId("changed-selected-discount");

        assertThatThrownBy(() -> service.confirm(7L, req))
                .isInstanceOf(BusinessException.class).hasMessageContaining("配置已变化");
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(unlockRecordDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void quoteExcludesTargetAlreadyUnlockedInAnotherSnapshot() {
        givenOpenSnapshotWithCandidates(2);
        when(unlockRecordDao.selectList(any()))
                .thenReturn(List.of(confirmedRecord(900L, "OLD-ITEM", 8L, 7)));
        givenCommercialConfig(5, 10);
        givenScene(7, 30);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(100));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        IdealUnlockQuoteVO result = service.quoteAll(7L, allReq());

        assertThat(result.getCandidateCount()).isEqualTo(1);
        assertThat(result.getOriginalCost()).isEqualTo(7);
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        assertThat(payload.getValue()).contains("IDI-002").doesNotContain("IDI-001");
    }

    @Test
    void confirmChargesOnceAllocatesExactCostAndReturnsPrivateMessageProfiles() {
        givenOpenSnapshotWithCandidates(3);
        when(candidateDao.selectByItemNos(eq(100L), any())).thenAnswer(invocation -> {
            List<String> itemNos = invocation.getArgument(1);
            return java.util.stream.IntStream.range(0, 3)
                    .mapToObj(index -> candidate(100L, "IDI-00" + (index + 1), 8L + index))
                    .filter(item -> itemNos.contains(item.getItemNo()))
                    .toList();
        });
        givenCommercialConfig(5, 10);
        givenScene(7, 30);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        UserAsset before = asset(100);
        UserAsset after = asset(81);
        when(userAssetDao.selectByUserId(7L)).thenReturn(before, after);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(before);
        when(userAssetDao.updateCoinBalance(7L, -19)).thenReturn(1);
        AtomicLong id = new AtomicLong(1000);
        org.mockito.Mockito.doAnswer(invocation -> {
            UserUnlockRecord record = invocation.getArgument(0);
            record.setId(id.incrementAndGet());
            return null;
        }).when(unlockRecordDao).insert(any());

        IdealUnlockQuoteVO quote = service.quoteAll(7L, allReq());
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), eq(Duration.ofMinutes(5)));
        when(valueOperations.get("miniapp:ideal-unlock:quote:" + quote.getQuoteToken()))
                .thenReturn(payload.getValue());

        IdealUnlockConfirmReq req = new IdealUnlockConfirmReq();
        req.setQuoteToken(quote.getQuoteToken());
        req.setRequestId("unlock-batch-001");
        IdealUnlockConfirmVO result = service.confirm(7L, req);

        assertThat(result.getPaidCost()).isEqualTo(19);
        assertThat(result.getNewBalance()).isEqualTo(81);
        assertThat(result.getUnlockedItems()).hasSize(3)
                .allSatisfy(item -> assertThat(item.getCommunicationMode()).isEqualTo("PRIVATE_MESSAGE"));
        verify(publicProfileService, never()).getPublicProfile(any(), any());
        ArgumentCaptor<UserUnlockRecord> unlocks = ArgumentCaptor.forClass(UserUnlockRecord.class);
        verify(unlockRecordDao, org.mockito.Mockito.times(3)).insert(unlocks.capture());
        assertThat(unlocks.getAllValues()).extracting(UserUnlockRecord::getCoinCost)
                .containsExactly(7, 6, 6);
        assertThat(unlocks.getAllValues()).extracting(UserUnlockRecord::getSnapshotItemNo)
                .doesNotHaveDuplicates();
        assertThat(unlocks.getAllValues()).extracting(UserUnlockRecord::getTargetBizNo)
                .containsExactly("8", "9", "10");
        ArgumentCaptor<UserCoinLog> logs = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao, org.mockito.Mockito.times(3)).insert(logs.capture());
        assertThat(logs.getAllValues()).extracting(UserCoinLog::getChangeAmount)
                .containsExactly(-7, -6, -6);
        assertThat(logs.getAllValues()).extracting(UserCoinLog::getBizIdempotencyKey)
                .doesNotHaveDuplicates();
    }

    @Test
    void repeatedConfirmReplaysOriginalPaidCostWithoutChargingAgain() {
        UserUnlockRecord first = confirmedRecord(1001L, "IDI-001", 8L, 7);
        UserUnlockRecord second = confirmedRecord(1002L, "IDI-002", 9L, 6);
        when(unlockRecordDao.selectList(any())).thenReturn(List.of(first, second));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(87));
        IdealUnlockConfirmReq req = new IdealUnlockConfirmReq();
        req.setRequestId("unlock-batch-001");
        req.setQuoteToken("iuq_same");

        IdealUnlockConfirmVO result = service.confirm(7L, req);

        assertThat(result.getAlreadyConfirmed()).isTrue();
        assertThat(result.getPaidCost()).isEqualTo(13);
        assertThat(result.getUnlockedItems()).hasSize(2);
        verify(userAssetDao).selectByUserIdForUpdate(7L);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(coinLogDao, never()).insert(any());
    }

    private void givenOpenSnapshotWithCandidates(int count) {
        IdealFilterSnapshot snapshot = new IdealFilterSnapshot();
        snapshot.setId(100L);
        snapshot.setSnapshotNo("IDS-001");
        snapshot.setUserId(7L);
        snapshot.setStatus("active");
        snapshot.setExpiresAt(LocalDateTime.now().plusDays(1));
        when(snapshotDao.selectBySnapshotNo("IDS-001")).thenReturn(snapshot);
        AppUser current = user(7L);
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        List<IdealSnapshotCandidate> candidates = java.util.stream.IntStream.range(0, count)
                .mapToObj(index -> candidate(100L, "IDI-00" + (index + 1), 8L + index))
                .toList();
        currentPageItemNos = candidates.stream().map(IdealSnapshotCandidate::getItemNo).toList();
        lenient().when(candidateDao.selectBySnapshotId(100L)).thenReturn(candidates);
        lenient().when(candidateDao.selectByItemNos(eq(100L), any())).thenAnswer(invocation -> {
            List<String> selected = invocation.getArgument(1);
            return candidates.stream().filter(item -> selected.contains(item.getItemNo())).toList();
        });
        when(appUserDao.selectByIds(any())).thenAnswer(invocation -> {
            java.util.Collection<Long> ids = invocation.getArgument(0);
            return ids.stream().map(this::user).toList();
        });
        when(accessProjectionService.projectAll(any())).thenAnswer(invocation -> {
            java.util.Collection<AppUser> users = invocation.getArgument(0);
            return users.stream().collect(java.util.stream.Collectors.toMap(AppUser::getId, item -> "OPEN"));
        });
    }

    private void givenCommercialConfig(int max, int discount) {
        lenient().when(appConfigDao.selectByKey("commercial.ideal.batch.max"))
                .thenReturn(config("commercial.ideal.batch.max", String.valueOf(max)));
        lenient().when(appConfigDao.selectByKey("commercial.ideal.batch.discount.percent"))
                .thenReturn(config("commercial.ideal.batch.discount.percent", String.valueOf(discount)));
    }

    private void givenScene(int unitPrice, int retentionDays) {
        CoinSceneConfig scene = new CoinSceneConfig();
        scene.setSceneCode("ideal_user_unlock");
        scene.setUnitPrice(unitPrice);
        scene.setRetentionDays(retentionDays);
        scene.setStatus("ENABLED");
        Page<CoinSceneConfig> page = new Page<>(1, 1);
        page.setRecords(List.of(scene));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(page);
    }

    private IdealUnlockAllQuoteReq allReq() {
        IdealUnlockAllQuoteReq req = new IdealUnlockAllQuoteReq();
        req.setSnapshotNo("IDS-001");
        req.setItemNos(currentPageItemNos);
        return req;
    }

    private IdealSnapshotCandidate candidate(Long snapshotId, String itemNo, Long userId) {
        IdealSnapshotCandidate candidate = new IdealSnapshotCandidate();
        candidate.setSnapshotId(snapshotId);
        candidate.setItemNo(itemNo);
        candidate.setCandidateUserId(userId);
        return candidate;
    }

    private AppUser user(Long id) {
        AppUser user = new AppUser();
        user.setId(id);
        return user;
    }

    private UserAsset asset(int balance) {
        UserAsset asset = new UserAsset();
        asset.setUserId(7L);
        asset.setCoinBalance(balance);
        return asset;
    }

    private AppConfig config(String key, String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        config.setStatus("ENABLED");
        return config;
    }

    private UserUnlockRecord confirmedRecord(Long id, String itemNo, Long targetUserId, int cost) {
        UserUnlockRecord record = new UserUnlockRecord();
        record.setId(id);
        record.setUserId(7L);
        record.setTargetUserId(targetUserId);
        record.setRequestId("unlock-batch-001");
        record.setQuoteToken("iuq_same");
        record.setSnapshotNo("IDS-001");
        record.setSnapshotItemNo(itemNo);
        record.setCoinCost(cost);
        record.setStatus("active");
        return record;
    }
}
