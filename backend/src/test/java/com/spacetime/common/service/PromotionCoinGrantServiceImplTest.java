package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.service.impl.PromotionCoinGrantServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 普通邀请千寻币原子入账与幂等测试。
 */
class PromotionCoinGrantServiceImplTest {
    private PromotionRewardLogDao rewardDao;
    private UserAssetDao assetDao;
    private UserCoinLogDao coinLogDao;
    private PromotionCoinGrantServiceImpl service;

    @BeforeEach
    void setUp() {
        rewardDao = mock(PromotionRewardLogDao.class);
        assetDao = mock(UserAssetDao.class);
        coinLogDao = mock(UserCoinLogDao.class);
        service = new PromotionCoinGrantServiceImpl(rewardDao, assetDao, coinLogDao);
    }

    @Test
    void 注册基础奖励同时更新余额资产流水和奖励成功证据() {
        PromotionRewardLog reward = reward();
        when(rewardDao.selectByIdForUpdate(1L)).thenReturn(reward);
        UserAsset asset = new UserAsset();
        asset.setCoinBalance(100);
        when(assetDao.selectByUserIdForUpdate(11L)).thenReturn(asset);
        when(assetDao.updateCoinBalance(11L, 20)).thenReturn(1);

        PromotionRewardLog result = service.grant(1L);

        assertThat(result.getStatus()).isEqualTo("success");
        assertThat(result.getSuccessTime()).isNotNull();
        verify(assetDao).updateCoinBalance(11L, 20);
        ArgumentCaptor<UserCoinLog> captor = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao).insert(captor.capture());
        assertThat(captor.getValue().getBalanceBefore()).isEqualTo(100);
        assertThat(captor.getValue().getBalanceAfter()).isEqualTo(120);
        assertThat(captor.getValue().getBizIdempotencyKey()).isEqualTo("normal:55:register_reward");
        assertThat(captor.getValue().getFlowType()).isEqualTo("reward");
        assertThat(captor.getValue().getBizScene()).isEqualTo("invite_register_reward");
        verify(rewardDao).updateById(reward);
    }

    @Test
    void 已成功奖励重复调用不重复入账() {
        PromotionRewardLog reward = reward();
        reward.setStatus("success");
        when(rewardDao.selectByIdForUpdate(1L)).thenReturn(reward);

        PromotionRewardLog result = service.grant(1L);

        assertThat(result).isSameAs(reward);
        verify(assetDao, never()).updateCoinBalance(any(), any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void 资产流水已存在时只补齐奖励成功状态() {
        PromotionRewardLog reward = reward();
        when(rewardDao.selectByIdForUpdate(1L)).thenReturn(reward);
        UserCoinLog existing = new UserCoinLog();
        existing.setId(9L);
        when(coinLogDao.selectByBizIdempotencyKey(reward.getIdempotencyKey())).thenReturn(existing);

        PromotionRewardLog result = service.grant(1L);

        assertThat(result.getStatus()).isEqualTo("success");
        assertThat(result.getCoinLogId()).isEqualTo(9L);
        verify(assetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void 零值奖励不更新余额但仍写零值资产流水并成功() {
        PromotionRewardLog reward = reward();
        reward.setAmount(BigDecimal.ZERO);
        when(rewardDao.selectByIdForUpdate(1L)).thenReturn(reward);
        UserAsset asset = new UserAsset();
        asset.setCoinBalance(100);
        when(assetDao.selectByUserIdForUpdate(11L)).thenReturn(asset);

        PromotionRewardLog result = service.grant(1L);

        assertThat(result.getStatus()).isEqualTo("success");
        verify(assetDao, never()).updateCoinBalance(any(), any());
        verify(coinLogDao).insert(org.mockito.ArgumentMatchers.argThat(log ->
                log.getChangeAmount() == 0
                        && log.getBalanceBefore() == 100
                        && log.getBalanceAfter() == 100));
    }

    private PromotionRewardLog reward() {
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setId(1L);
        reward.setRelationId(55L);
        reward.setInviterId(11L);
        reward.setInviteeId(99L);
        reward.setEventType("register_reward");
        reward.setAmount(new BigDecimal("20"));
        reward.setStatus("pending");
        reward.setIdempotencyKey("normal:55:register_reward");
        return reward;
    }
}
