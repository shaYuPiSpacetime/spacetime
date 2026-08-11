package com.spacetime.common.service.impl;

import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.MessagePromotionFactReconcileService;
import com.spacetime.common.service.PromotionMessageNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 最近 24 小时邀请奖励结果消息对账。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessagePromotionFactReconcileServiceImpl
        implements MessagePromotionFactReconcileService {
    private static final int MAX_LIMIT = 1000;

    private final PromotionRewardLogDao rewardDao;
    private final PromotionMessageNotificationService notificationService;

    @Override
    public int reconcileRecentRewards(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        int boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        List<PromotionRewardLog> rewards = rewardDao.selectTerminalWithoutMessage(
                effectiveNow.minusHours(24), boundedLimit);
        if (rewards == null || rewards.isEmpty()) {
            return 0;
        }
        int reconciled = 0;
        for (PromotionRewardLog reward : rewards) {
            try {
                if (notificationService.publishRewardResult(reward, effectiveNow)) {
                    reconciled++;
                }
            } catch (RuntimeException ex) {
                log.warn("邀请奖励结果消息对账失败: rewardNo={}, errorType={}",
                        reward.getRewardNo(), ex.getClass().getSimpleName());
            }
        }
        return reconciled;
    }
}
