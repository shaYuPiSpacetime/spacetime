package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.PromotionRewardBizSceneEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionCoinGrantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 普通邀请千寻币原子发放实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionCoinGrantServiceImpl implements PromotionCoinGrantService {
    private final PromotionRewardLogDao rewardDao;
    private final UserAssetDao assetDao;
    private final UserCoinLogDao coinLogDao;

    @Override
    @Transactional
    public PromotionRewardLog grant(Long rewardId) {
        PromotionRewardLog reward = rewardDao.selectByIdForUpdate(rewardId);
        if (reward == null) {
            throw new BusinessException(404, "奖励流水不存在");
        }
        if (PromotionRewardStatusEnum.SUCCESS.getCode().equals(reward.getStatus())) {
            return reward;
        }
        UserCoinLog existing = coinLogDao.selectByBizIdempotencyKey(reward.getIdempotencyKey());
        if (existing != null) {
            markSuccess(reward, existing.getId());
            return reward;
        }
        int amount;
        try {
            amount = reward.getAmount().intValueExact();
        } catch (ArithmeticException ex) {
            throw new BusinessException("普通邀请奖励必须为整数千寻币");
        }
        UserAsset asset = assetDao.selectByUserIdForUpdate(reward.getInviterId());
        if (asset == null) {
            throw new BusinessException("邀请人资产账户不存在");
        }
        int balanceBefore = asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
        if (amount != 0 && assetDao.updateCoinBalance(reward.getInviterId(), amount) != 1) {
            throw new BusinessException("邀请奖励资产入账失败");
        }
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo("CL-" + IdUtil.getSnowflakeNextIdStr());
        coinLog.setUserId(reward.getInviterId());
        coinLog.setFlowType(FlowTypeEnum.REWARD.getCode());
        coinLog.setChangeAmount(amount);
        coinLog.setBalanceBefore(balanceBefore);
        coinLog.setBalanceAfter(balanceBefore + amount);
        coinLog.setBizScene(PromotionRewardBizSceneEnum.fromEventType(reward.getEventType()));
        coinLog.setBizDesc(reward.getEventLabelSnapshot());
        coinLog.setRefId(reward.getId());
        coinLog.setRefType("promotion_reward");
        coinLog.setBizIdempotencyKey(reward.getIdempotencyKey());
        coinLogDao.insert(coinLog);
        markSuccess(reward, coinLog.getId());
        return reward;
    }

    private void markSuccess(PromotionRewardLog reward, Long coinLogId) {
        reward.setStatus(PromotionRewardStatusEnum.SUCCESS.getCode());
        reward.setCoinLogId(coinLogId);
        reward.setSuccessTime(LocalDateTime.now());
        reward.setNextRetryTime(null);
        reward.setFailureReason(null);
        rewardDao.updateById(reward);
    }
}
