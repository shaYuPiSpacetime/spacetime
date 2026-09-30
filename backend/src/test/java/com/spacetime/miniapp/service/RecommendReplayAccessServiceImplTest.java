package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.RecommendReplayUnlockReq;
import com.spacetime.miniapp.dto.response.RecommendReplayItemVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.service.impl.RecommendReplayAccessServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 三天回放主页按人解锁的计费与权益测试。 */
@ExtendWith(MockitoExtension.class)
class RecommendReplayAccessServiceImplTest {
    @Mock private RecommendService recommendService;
    @Mock private CoinSceneConfigDao sceneConfigDao;
    @Mock private UserAssetDao assetDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private RecommendViewLogDao viewLogDao;
    @Mock private VipService vipService;
    @InjectMocks private RecommendReplayAccessServiceImpl service;

    @Test
    void nonMemberQuoteShowsCurrentPriceAndBalance() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(20));
        when(assetDao.selectByUserId(7L)).thenReturn(asset(25));

        var quote = service.quote(7L, 8L);

        assertThat(quote.getCanOpen()).isFalse();
        assertThat(quote.getMemberAccess()).isFalse();
        assertThat(quote.getUnitPrice()).isEqualTo(20);
        assertThat(quote.getCoinBalance()).isEqualTo(25);
    }

    @Test
    void memberCanOpenWithoutPriceOrDebit() {
        when(recommendService.getReplay(7L)).thenReturn(replay(true));

        var quote = service.quote(7L, 8L);
        var result = service.unlock(7L, 8L, request("member-1", 0));

        assertThat(quote.getCanOpen()).isTrue();
        assertThat(quote.getMemberAccess()).isTrue();
        assertThat(result.getCanOpen()).isTrue();
        assertThat(result.getCoinCost()).isZero();
        verify(assetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void nonMemberUnlockChargesOnceAndWritesTargetRecordAndFlow() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(assetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(25));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(20));
        when(assetDao.updateCoinBalance(7L, -20)).thenReturn(1);

        var result = service.unlock(7L, 8L, request("replay-1", 20));

        assertThat(result.getCanOpen()).isTrue();
        assertThat(result.getCoinCost()).isEqualTo(20);
        assertThat(result.getCoinBalance()).isEqualTo(5);
        ArgumentCaptor<UserUnlockRecord> record = ArgumentCaptor.forClass(UserUnlockRecord.class);
        verify(unlockRecordDao).insert(record.capture());
        assertThat(record.getValue().getUnlockScene()).isEqualTo("replay_profile_unlock_one");
        assertThat(record.getValue().getTargetBizType()).isEqualTo("replay");
        assertThat(record.getValue().getTargetBizNo()).isEqualTo("8");
        assertThat(record.getValue().getTargetUserId()).isEqualTo(8L);
        assertThat(record.getValue().getRequestId()).isEqualTo("replay-1");
        ArgumentCaptor<UserCoinLog> flow = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao).insert(flow.capture());
        assertThat(flow.getValue().getChangeAmount()).isEqualTo(-20);
        assertThat(flow.getValue().getBizScene()).isEqualTo("replay_unlock");
        assertThat(flow.getValue().getBizIdempotencyKey()).isEqualTo("replay:7:replay-1");
    }

    @Test
    void unlockedTargetDoesNotChargeAgain() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(assetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(5));
        UserUnlockRecord existing = new UserUnlockRecord();
        existing.setTargetUserId(8L);
        existing.setRequestId("first-unlock");
        when(unlockRecordDao.selectActiveByTargetUser(7L, "replay", 8L)).thenReturn(existing);

        var result = service.unlock(7L, 8L, request("second-tap", 20));

        assertThat(result.getCanOpen()).isTrue();
        assertThat(result.getCoinCost()).isZero();
        verify(assetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void paidIdealTargetQuoteIsAlreadyOpenWithoutReplayPrice() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(assetDao.selectByUserId(7L)).thenReturn(asset(25));
        UserUnlockRecord idealUnlock = new UserUnlockRecord();
        when(unlockRecordDao.selectActiveByTargetUser(7L, "replay", 8L)).thenReturn(null);
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(idealUnlock);

        var quote = service.quote(7L, 8L);

        assertThat(quote.getCanOpen()).isTrue();
        assertThat(quote.getUnitPrice()).isZero();
        assertThat(quote.getCoinBalance()).isEqualTo(25);
        verify(sceneConfigDao, never()).selectPage(any(), any());
    }

    @Test
    void paidIdealTargetUnlockDoesNotDebitAgain() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(assetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(25));
        UserUnlockRecord idealUnlock = new UserUnlockRecord();
        when(unlockRecordDao.selectActiveByTargetUser(7L, "replay", 8L)).thenReturn(null);
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(idealUnlock);

        var result = service.unlock(7L, 8L, request("ideal-already-paid", 20));

        assertThat(result.getCanOpen()).isTrue();
        assertThat(result.getCoinCost()).isZero();
        assertThat(result.getCoinBalance()).isEqualTo(25);
        verify(assetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void lightweightAccessAllowsEffectiveReplayMemberWithoutBuildingReplay() {
        UserAsset member = asset(0);
        member.setVipStatus("active");
        when(assetDao.selectByUserId(7L)).thenReturn(member);
        VipBenefitVO benefit = new VipBenefitVO();
        benefit.setBenefitCode("three_day_replay");
        when(vipService.getBenefits()).thenReturn(List.of(benefit));

        assertThat(service.canOpenRecommendedProfile(7L, 8L)).isTrue();
        verify(recommendService, never()).getReplay(any());
    }

    @Test
    void lightweightAccessAllowsExistingReplayUnlockWithoutBuildingReplay() {
        when(unlockRecordDao.selectActiveByTargetUser(7L, "replay", 8L))
                .thenReturn(new UserUnlockRecord());

        assertThat(service.canOpenRecommendedProfile(7L, 8L)).isTrue();
        verify(recommendService, never()).getReplay(any());
    }

    @Test
    void lightweightAccessAllowsExistingIdealUnlockWithoutBuildingReplay() {
        when(unlockRecordDao.selectActiveByTargetUser(7L, "replay", 8L)).thenReturn(null);
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L))
                .thenReturn(new UserUnlockRecord());

        assertThat(service.canOpenRecommendedProfile(7L, 8L)).isTrue();
        verify(recommendService, never()).getReplay(any());
    }

    @Test
    void lightweightAccessRejectsExpiredVipWithoutUnlock() {
        UserAsset expired = asset(25);
        expired.setVipStatus("active");
        expired.setVipExpireTime(java.time.LocalDateTime.now().minusSeconds(1));
        when(assetDao.selectByUserId(7L)).thenReturn(expired);

        assertThat(service.canOpenRecommendedProfile(7L, 8L)).isFalse();
        verify(recommendService, never()).getReplay(any());
    }

    @Test
    void currentDayTargetQuoteAndUnlockAreFreeWithoutMembership() {
        when(recommendService.getReplay(7L)).thenReturn(replayToday(false));
        when(assetDao.selectByUserId(7L)).thenReturn(asset(25));
        when(viewLogDao.selectList(any())).thenReturn(List.of(issuedToday()));

        var quote = service.quote(7L, 8L);
        var unlocked = service.unlock(7L, 8L, request("today-free", 0));

        assertThat(quote.getCanOpen()).isTrue();
        assertThat(quote.getMemberAccess()).isFalse();
        assertThat(quote.getUnitPrice()).isZero();
        assertThat(unlocked.getCanOpen()).isTrue();
        assertThat(unlocked.getCoinCost()).isZero();
        assertThat(unlocked.getCoinBalance()).isEqualTo(25);
        verify(assetDao, never()).updateCoinBalance(any(), any());
        verify(sceneConfigDao, never()).selectPage(any(), any());
    }

    @Test
    void targetInBothTodayAndYesterdayReplayRemainsFree() {
        RecommendReplayPageVO replay = replayToday(false);
        RecommendReplayItemVO yesterday = new RecommendReplayItemVO();
        yesterday.setCandidateNo("8");
        yesterday.setViewedAt(java.time.LocalDate.now().minusDays(1).atTime(12, 0));
        replay.setItems(List.of(yesterday, replay.getItems().get(0)));
        when(recommendService.getReplay(7L)).thenReturn(replay);
        when(assetDao.selectByUserId(7L)).thenReturn(asset(25));
        when(viewLogDao.selectList(any())).thenReturn(List.of(issuedToday()));

        var quote = service.quote(7L, 8L);

        assertThat(quote.getCanOpen()).isTrue();
        assertThat(quote.getUnitPrice()).isZero();
        verify(sceneConfigDao, never()).selectPage(any(), any());
    }

    @Test
    void forgedTodayReplayActionDoesNotGrantFreeProfileAccess() {
        RecommendReplayPageVO replay = replayToday(false);
        RecommendReplayItemVO yesterday = new RecommendReplayItemVO();
        yesterday.setCandidateNo("8");
        yesterday.setViewedAt(java.time.LocalDate.now().minusDays(1).atTime(12, 0));
        replay.setItems(List.of(replay.getItems().get(0), yesterday));
        when(recommendService.getReplay(7L)).thenReturn(replay);
        when(assetDao.selectByUserId(7L)).thenReturn(asset(25));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(20));

        var quote = service.quote(7L, 8L);

        assertThat(quote.getCanOpen()).isFalse();
        assertThat(quote.getUnitPrice()).isEqualTo(20);
    }

    @Test
    void clientViewActionIsNotServerIssuedCandidateEvidence() {
        RecommendViewLog forged = issuedToday();
        forged.setAction("view");
        when(viewLogDao.selectList(any())).thenReturn(List.of(forged));

        assertThat(service.isTodayIssuedCandidate(7L, 8L)).isFalse();
    }

    @Test
    void serverIssuedCandidateEvidenceIsRecognizedToday() {
        when(viewLogDao.selectList(any())).thenReturn(List.of(issuedToday()));

        assertThat(service.isTodayIssuedCandidate(7L, 8L)).isTrue();
    }

    @Test
    void insufficientBalanceOrChangedPriceNeverDebits() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));
        when(assetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(10));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(20));

        assertThatThrownBy(() -> service.unlock(7L, 8L, request("low-balance", 20)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("余额不足");
        assertThatThrownBy(() -> service.unlock(7L, 8L, request("old-quote", 19)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("价格已变化");
        verify(assetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void targetMustStillBeInUsersRecentReplay() {
        when(recommendService.getReplay(7L)).thenReturn(replay(false));

        assertThatThrownBy(() -> service.quote(7L, 9L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("回放");
        verify(assetDao, never()).selectByUserId(any());
    }

    private RecommendReplayPageVO replay(boolean member) {
        RecommendReplayItemVO item = new RecommendReplayItemVO();
        item.setCandidateNo("8");
        RecommendReplayPageVO result = new RecommendReplayPageVO();
        result.setItems(List.of(item));
        result.setMemberProfileAccess(member);
        return result;
    }

    private RecommendReplayPageVO replayToday(boolean member) {
        RecommendReplayPageVO result = replay(member);
        result.getItems().get(0).setViewedAt(java.time.LocalDateTime.now());
        return result;
    }

    private RecommendViewLog issuedToday() {
        RecommendViewLog log = new RecommendViewLog();
        log.setUserId(7L);
        log.setCandidateUserId(8L);
        log.setAction("issued");
        log.setViewedAt(java.time.LocalDateTime.now());
        return log;
    }

    private Page<CoinSceneConfig> scenePage(int price) {
        CoinSceneConfig scene = new CoinSceneConfig();
        scene.setSceneCode("replay_profile_unlock_one");
        scene.setUnitPrice(price);
        scene.setStatus("ENABLED");
        Page<CoinSceneConfig> page = new Page<>(1, 1);
        page.setRecords(List.of(scene));
        return page;
    }

    private UserAsset asset(int balance) {
        UserAsset asset = new UserAsset();
        asset.setCoinBalance(balance);
        return asset;
    }

    private RecommendReplayUnlockReq request(String id, int price) {
        RecommendReplayUnlockReq req = new RecommendReplayUnlockReq();
        req.setRequestId(id);
        req.setExpectedPrice(price);
        return req;
    }
}
