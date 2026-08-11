package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 对账最近邀请奖励终态并补齐缺失系统消息。 */
public interface MessagePromotionFactReconcileService {
    int reconcileRecentRewards(LocalDateTime now, int limit);
}
