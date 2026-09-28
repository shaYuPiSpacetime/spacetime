package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.RecommendReplayUnlockReq;
import com.spacetime.miniapp.dto.response.RecommendReplayItemVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
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
