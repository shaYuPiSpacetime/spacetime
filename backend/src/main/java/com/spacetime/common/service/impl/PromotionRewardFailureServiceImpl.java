package com.spacetime.common.service.impl;

import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionRetryPolicy;
import com.spacetime.common.service.PromotionRewardFailureService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 奖励失败状态和退避计划服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionRewardFailureServiceImpl implements PromotionRewardFailureService {
    private final PromotionRewardLogDao rewardDao;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PromotionRewardLog markFailed(Long rewardId, String reason, LocalDateTime failedAt) {
        PromotionRewardLog reward = rewardDao.selectByIdForUpdate(rewardId);
        if (reward == null) {
            throw new BusinessException(404, "奖励流水不存在");
        }
        if (PromotionRewardStatusEnum.SUCCESS.getCode().equals(reward.getStatus())) {
            return reward;
        }
        int retryCount = reward.getRetryCount() == null ? 0 : reward.getRetryCount();
        reward.setStatus(PromotionRewardStatusEnum.FAILED.getCode());
        reward.setFailureReason(abbreviate(reason));
        reward.setLastRetryTime(failedAt);
        reward.setNextRetryTime(PromotionRetryPolicy.canAutoRetry(retryCount)
                ? failedAt.plus(PromotionRetryPolicy.nextDelay(retryCount))
                : null);
        reward.setRetryCount(retryCount + 1);
        rewardDao.updateById(reward);
        return reward;
    }

    private String abbreviate(String reason) {
        if (reason == null || reason.isBlank()) {
            return "未知发放错误";
        }
        return reason.length() > 500 ? reason.substring(0, 500) : reason;
    }
}
