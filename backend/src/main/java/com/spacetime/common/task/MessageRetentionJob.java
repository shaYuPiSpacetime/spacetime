package com.spacetime.common.task;

import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageRetentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 每日清理到期正文和可靠事件临时载荷，不删除消息业务事实。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageRetentionJob {
    private static final int CONTENT_BATCH = 500;
    private static final int MAX_CONTENT_BATCHES = 20;
    private static final int INBOX_BATCH = 1000;

    private final MessageRetentionService retentionService;
    private final MessageEventInboxService inboxService;

    @Scheduled(cron = "${message.retention.cron:0 30 2 * * ?}")
    public void run() {
        runAt(LocalDateTime.now());
    }

    public void runAt(LocalDateTime now) {
        int contentCleared = 0;
        for (int batch = 0; batch < MAX_CONTENT_BATCHES; batch++) {
            int affected = retentionService.clearExpiredMessageContent(now, CONTENT_BATCH);
            contentCleared += affected;
            if (affected < CONTENT_BATCH) break;
        }
        int inboxCleared = inboxService.clearExpiredPayloads(now, INBOX_BATCH);
        if (contentCleared > 0 || inboxCleared > 0) {
            log.info("消息分类留存任务完成，正文清理={}，Inbox临时载荷清理={}", contentCleared, inboxCleared);
        }
    }
}
