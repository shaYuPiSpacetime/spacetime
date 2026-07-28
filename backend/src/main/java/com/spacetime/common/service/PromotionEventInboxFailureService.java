package com.spacetime.common.service;

/**
 * 在独立事务内记录推广事件技术失败及退避时间。
 */
public interface PromotionEventInboxFailureService {
    void markFailed(Long inboxId, Throwable error);
}
