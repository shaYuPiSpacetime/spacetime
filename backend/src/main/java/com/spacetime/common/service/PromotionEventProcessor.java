package com.spacetime.common.service;

import java.util.List;

/**
 * 在单个事务内处理已认领的推广事实事件。
 */
public interface PromotionEventProcessor {
    /**
     * @return 事务提交后需要尝试发放的普通邀请奖励 ID。
     */
    List<Long> processClaimed(Long inboxId);
}
