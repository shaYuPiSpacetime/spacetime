package com.spacetime.common.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.PromotionCoinGrantService;
import com.spacetime.common.service.PromotionRewardFailureService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 普通邀请奖励自动补偿任务。
 */
@Component
@RequiredArgsConstructor
public class PromotionRewardRetryJob {
    private final PromotionRewardLogDao rewardDao;
    private final PromotionCoinGrantService grantService;
    private final PromotionRewardFailureService failureService;

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
                grantService.grant(reward.getId());
            } catch (Exception ex) {
                failureService.markFailed(reward.getId(), ex.getMessage(), LocalDateTime.now());
            }
        }
    }
}
