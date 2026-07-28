package com.spacetime.common.service.impl;

import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.entity.PromotionEventInbox;
import com.spacetime.common.service.PromotionEventInboxFailureService;
import com.spacetime.common.service.PromotionRetryPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 推广事件失败状态独立事务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionEventInboxFailureServiceImpl implements PromotionEventInboxFailureService {
    private final PromotionEventInboxDao inboxDao;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long inboxId, Throwable error) {
        PromotionEventInbox inbox = inboxDao.selectById(inboxId);
        if (inbox == null || !"processing".equals(inbox.getStatus())) {
            return;
        }
        int retryCount = inbox.getRetryCount() == null ? 0 : inbox.getRetryCount();
        LocalDateTime failedAt = LocalDateTime.now();
        inbox.setStatus("failed");
        inbox.setRetryCount(retryCount + 1);
        inbox.setLastError(safeError(error));
        inbox.setNextRetryTime(PromotionRetryPolicy.canAutoRetry(retryCount)
                ? failedAt.plus(PromotionRetryPolicy.nextDelay(retryCount))
                : null);
        inboxDao.updateById(inbox);
    }

    private String safeError(Throwable error) {
        String message = error == null ? null : error.getMessage();
        if (message == null || message.isBlank()) {
            message = error == null ? "未知技术异常" : error.getClass().getSimpleName();
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
