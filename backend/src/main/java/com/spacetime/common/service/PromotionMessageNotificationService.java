package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionRewardLog;

import java.time.LocalDateTime;

/** 将邀请奖励终态幂等发布为 PRD-03 系统消息。 */
public interface PromotionMessageNotificationService {
    boolean publishRewardResult(PromotionRewardLog reward, LocalDateTime now);
}
