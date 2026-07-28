package com.spacetime.common.task;

import com.spacetime.common.service.PromotionEventInboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 推广事实事件收件箱补偿任务。
 */
@Component
@RequiredArgsConstructor
public class PromotionEventInboxJob {
    private final PromotionEventInboxService inboxService;

    @Scheduled(fixedDelayString = "${promotion.event-inbox.delay-ms:5000}")
    public void processPending() {
        inboxService.processPendingBatch();
    }
}
