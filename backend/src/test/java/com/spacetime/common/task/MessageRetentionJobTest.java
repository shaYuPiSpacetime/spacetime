package com.spacetime.common.task;

import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageRetentionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("PRD-03 消息分类留存任务")
class MessageRetentionJobTest {
    @Test
    @DisplayName("每日任务应清理到期正文和Inbox临时载荷")
    void shouldClearMessageContentAndTemporaryInboxPayload() {
        MessageRetentionService retentionService = mock(MessageRetentionService.class);
        MessageEventInboxService inboxService = mock(MessageEventInboxService.class);
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 2, 30);
        when(retentionService.clearExpiredMessageContent(now, 500)).thenReturn(12);
        when(inboxService.clearExpiredPayloads(now, 1000)).thenReturn(3);

        new MessageRetentionJob(retentionService, inboxService).runAt(now);

        verify(retentionService).clearExpiredMessageContent(now, 500);
        verify(inboxService).clearExpiredPayloads(now, 1000);
    }
}
