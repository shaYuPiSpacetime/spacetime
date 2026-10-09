package com.spacetime.common.task;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.service.MessageDeliveryOutboxService;
import com.spacetime.common.service.MessageWhisperReplyReconcileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("消息Outbox调度任务")
class MessageDeliveryOutboxJobTest {

    @Test
    @DisplayName("没有待投递Outbox时不执行高频历史扫描")
    void shouldNotScanWhisperHistoryWhenOutboxIsEmpty() {
        AppMessageDeliveryOutboxDao outboxDao = mock(AppMessageDeliveryOutboxDao.class);
        MessageDeliveryOutboxService deliveryService = mock(MessageDeliveryOutboxService.class);
        MessageWhisperReplyReconcileService reconcileService =
                mock(MessageWhisperReplyReconcileService.class);
        when(outboxDao.selectClaimable(any(LocalDateTime.class), any(LocalDateTime.class), eq(100)))
                .thenReturn(List.of());
        MessageDeliveryOutboxJob job = new MessageDeliveryOutboxJob(
                outboxDao, deliveryService, reconcileService);

        job.deliver();

        verifyNoInteractions(deliveryService, reconcileService);
    }

    @Test
    @DisplayName("处理悄悄话回复Outbox后应立即补全业务状态")
    void shouldReconcileAfterWhisperReplyOutbox() {
        AppMessageDeliveryOutboxDao outboxDao = mock(AppMessageDeliveryOutboxDao.class);
        MessageDeliveryOutboxService deliveryService = mock(MessageDeliveryOutboxService.class);
        MessageWhisperReplyReconcileService reconcileService =
                mock(MessageWhisperReplyReconcileService.class);
        AppMessageDeliveryOutbox outbox = new AppMessageDeliveryOutbox();
        outbox.setId(10L);
        outbox.setEventType("whisper_reply");
        when(outboxDao.selectClaimable(any(LocalDateTime.class), any(LocalDateTime.class), eq(100)))
                .thenReturn(List.of(outbox));
        MessageDeliveryOutboxJob job = new MessageDeliveryOutboxJob(
                outboxDao, deliveryService, reconcileService);

        job.deliver();

        verify(deliveryService).process(eq(10L), any(LocalDateTime.class));
        verify(reconcileService).reconcile(any(LocalDateTime.class), eq(100));
    }
}
