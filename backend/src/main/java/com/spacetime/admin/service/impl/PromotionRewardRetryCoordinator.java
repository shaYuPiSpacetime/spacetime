package com.spacetime.admin.service.impl;

import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 人工重试奖励协调器，确保失败状态落库后向接口返回明确失败。
 */
@Service
@RequiredArgsConstructor
public class PromotionRewardRetryCoordinator {
    private final PromotionRewardRetryAdminService transactionalService;

    public PromotionRewardLog retryOrThrow(Long rewardId, Long operatorId) {
        try {
            return transactionalService.retry(rewardId, operatorId);
        } catch (Exception ex) {
            transactionalService.recordFailedRetry(rewardId, operatorId, ex.getMessage());
            throw new BusinessException(70006, "奖励发放仍然失败，请稍后重试");
        }
    }
}
