package com.spacetime.common.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.PromotionCoinGrantService;
import com.spacetime.common.service.PromotionRewardFailureService;
import com.spacetime.common.service.PromotionMessageNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 普通邀请奖励自动补偿任务。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PromotionRewardRetryJob {
    private final PromotionRewardLogDao rewardDao;
    private final PromotionCoinGrantService grantService;
    private final PromotionRewardFailureService failureService;
    private final PromotionMessageNotificationService notificationService;

    @Scheduled(fixedDelayString = "${promotion.reward-retry.delay-ms:60000}")
    public void retryDueRewards() {
        Page<PromotionRewardLog> page = rewardDao.selectPage(
                new Page<>(1, 100, false),
                new LambdaQueryWrapper<PromotionRewardLog>()
                        .and(wrapper -> wrapper.eq(PromotionRewardLog::getStatus, "pending")
                                .or(item -> item.eq(PromotionRewardLog::getStatus, "failed")
                                        .lt(PromotionRewardLog::getRetryCount, 4)
                                        .isNotNull(PromotionRewardLog::getNextRetryTime)
                                        .le(PromotionRewardLog::getNextRetryTime, LocalDateTime.now())))
                        .orderByAsc(PromotionRewardLog::getCreateTime));
        for (PromotionRewardLog reward : page.getRecords()) {
            try {
                PromotionRewardLog granted = grantService.grant(reward.getId());
                publishNotificationQuietly(granted);
            } catch (Exception ex) {
                PromotionRewardLog failed = failureService.markFailed(
                        reward.getId(), ex.getMessage(), LocalDateTime.now());
                publishNotificationQuietly(failed);
            }
        }
    }

    private void publishNotificationQuietly(PromotionRewardLog reward) {
        try {
            notificationService.publishRewardResult(reward, LocalDateTime.now());
        } catch (RuntimeException ex) {
            log.warn("邀请奖励补偿结果消息入箱失败，等待事实对账: rewardNo={}",
                    reward == null ? null : reward.getRewardNo());
        }
    }
}
