package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionRewardLog;

import java.time.LocalDateTime;

/**
 * 奖励失败状态和退避计划服务。
 */
public interface PromotionRewardFailureService {
    PromotionRewardLog markFailed(Long rewardId, String reason, LocalDateTime failedAt);
}
