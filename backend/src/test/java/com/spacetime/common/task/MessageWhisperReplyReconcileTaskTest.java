package com.spacetime.common.task;

import com.spacetime.common.service.MessageWhisperReplyReconcileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("历史悄悄话回复卡单任务")
class MessageWhisperReplyReconcileTaskTest {

    @Test
    @DisplayName("定时任务应有界扫描历史卡单")
    void shouldReconcileHistoricalReservations() {
        MessageWhisperReplyReconcileService service =
                mock(MessageWhisperReplyReconcileService.class);
        MessageWhisperReplyReconcileTask task =
                new MessageWhisperReplyReconcileTask(service);

        task.reconcile();

        verify(service).reconcile(any(LocalDateTime.class), eq(100));
    }
}
