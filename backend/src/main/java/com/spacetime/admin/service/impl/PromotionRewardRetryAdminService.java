package com.spacetime.admin.service.impl;

import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionCoinGrantService;
import com.spacetime.common.service.PromotionRetryPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 人工重试奖励的事务编排。
 *
 * <p>成功入账与成功审计同事务；再次失败时，失败状态与失败审计也在同一独立事务提交。</p>
 */
@Service
@RequiredArgsConstructor
public class PromotionRewardRetryAdminService {
    private final PromotionRewardLogDao rewardDao;
    private final PromotionCoinGrantService coinGrantService;
    private final PromotionAuditLogDao auditLogDao;

    @Transactional
    public PromotionRewardLog retry(Long rewardId, Long operatorId) {
        PromotionRewardLog before = rewardDao.selectById(rewardId);
        PromotionRewardLog result = coinGrantService.grant(rewardId);
        insertAudit(operatorId, result, "retry_reward", auditValue(before), auditValue(result));
        return result;
    }

    @Transactional
    public PromotionRewardLog recordFailedRetry(Long rewardId, Long operatorId, String reason) {
        PromotionRewardLog reward = rewardDao.selectByIdForUpdate(rewardId);
        if (reward == null) {
            throw new BusinessException(404, "奖励流水不存在");
        }
        String before = auditValue(reward);
        int retryCount = reward.getRetryCount() == null ? 0 : reward.getRetryCount();
        LocalDateTime failedAt = LocalDateTime.now();
        reward.setStatus(PromotionRewardStatusEnum.FAILED.getCode());
        reward.setFailureReason(abbreviate(reason));
        reward.setLastRetryTime(failedAt);
        reward.setNextRetryTime(PromotionRetryPolicy.canAutoRetry(retryCount)
                ? failedAt.plus(PromotionRetryPolicy.nextDelay(retryCount)) : null);
        reward.setRetryCount(retryCount + 1);
        rewardDao.updateById(reward);
        insertAudit(operatorId, reward, "retry_reward_failed", before, auditValue(reward));
        return reward;
    }

    private void insertAudit(Long operatorId, PromotionRewardLog reward,
                             String action, String before, String after) {
        PromotionAuditLog log = new PromotionAuditLog();
        log.setBizType("reward");
        log.setBizId(reward.getId());
        log.setAction(action);
        log.setBeforeValue(before);
        log.setAfterValue(after);
        log.setRemark("人工重试奖励");
        log.setCreatedBy(operatorId);
        log.setUpdatedBy(operatorId);
        auditLogDao.insert(log);
    }

    private String auditValue(PromotionRewardLog reward) {
        if (reward == null) {
            return null;
        }
        return "{\"rewardNo\":\"" + reward.getRewardNo()
                + "\",\"status\":\"" + reward.getStatus()
                + "\",\"retryCount\":" + (reward.getRetryCount() == null ? 0 : reward.getRetryCount())
                + "}";
    }

    private String abbreviate(String reason) {
        if (reason == null || reason.isBlank()) {
            return "未知发放错误";
        }
        return reason.length() > 500 ? reason.substring(0, 500) : reason;
    }
}
