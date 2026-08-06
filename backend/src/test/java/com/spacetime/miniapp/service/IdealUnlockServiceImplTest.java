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
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.impl.IdealUnlockServiceImpl;
import org.junit.jupiter.api.Test;
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
    void unlockAllRejectsInsteadOfSilentlyTruncatingWhenBatchLimitExceeded() {
        givenOpenSnapshotWithCandidates(3);
        when(appConfigDao.selectByKey("commercial.ideal.batch.max"))
                .thenReturn(config("commercial.ideal.batch.max", "2"));

        assertThatThrownBy(() -> service.quoteAll(7L, allReq()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("最多解锁2人");
        verify(redisTemplate, never()).opsForValue();
    }

    @Test
    void quoteExcludesTargetAlreadyUnlockedInAnotherSnapshot() {
        givenOpenSnapshotWithCandidates(2);
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L))
                .thenReturn(confirmedRecord(900L, "OLD-ITEM", 8L, 7));
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
        when(publicProfileService.getPublicProfile(eq(7L), any())).thenAnswer(invocation -> {
            PublicProfileVO profile = new PublicProfileVO();
            profile.setUserId(invocation.getArgument(1));
            return profile;
        });

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
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(87));
        when(publicProfileService.getPublicProfile(eq(7L), any())).thenAnswer(invocation -> {
            PublicProfileVO profile = new PublicProfileVO();
            profile.setUserId(invocation.getArgument(1));
            return profile;
        });
        IdealUnlockConfirmReq req = new IdealUnlockConfirmReq();
        req.setRequestId("unlock-batch-001");
        req.setQuoteToken("iuq_same");

        IdealUnlockConfirmVO result = service.confirm(7L, req);

        assertThat(result.getAlreadyConfirmed()).isTrue();
        assertThat(result.getPaidCost()).isEqualTo(13);
        assertThat(result.getUnlockedItems()).hasSize(2);
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
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
        when(candidateDao.selectBySnapshotId(100L)).thenReturn(candidates);
        for (IdealSnapshotCandidate candidate : candidates) {
            AppUser target = user(candidate.getCandidateUserId());
            lenient().when(appUserDao.selectById(candidate.getCandidateUserId())).thenReturn(target);
            lenient().when(accessProjectionService.project(target)).thenReturn("OPEN");
        }
    }

    private void givenCommercialConfig(int max, int discount) {
        when(appConfigDao.selectByKey("commercial.ideal.batch.max"))
                .thenReturn(config("commercial.ideal.batch.max", String.valueOf(max)));
        when(appConfigDao.selectByKey("commercial.ideal.batch.discount.percent"))
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
