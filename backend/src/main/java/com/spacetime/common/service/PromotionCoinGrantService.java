package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionRewardLog;

/**
 * 普通邀请千寻币发放服务。
 */
public interface PromotionCoinGrantService {
    PromotionRewardLog grant(Long rewardId);
}
