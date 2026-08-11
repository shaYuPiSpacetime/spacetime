package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.provider.InstantMessageProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.provider.InstantMessageSendResult;
import com.spacetime.common.service.impl.MessageDeliveryOutboxServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("消息 Delivery Outbox 可靠投递")
class MessageDeliveryOutboxServiceImplTest {
    @Mock private AppMessageDeliveryOutboxDao outboxDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private InstantMessageProvider instantMessageProvider;

    private MessageDeliveryOutboxServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MessageDeliveryOutboxServiceImpl(outboxDao, recordDao, whisperDao,
                instantMessageProvider);
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("TIM 投递应从消息主表读取正文并回写唯一映射")
    void shouldReadBodyFromMessageRecordAndConfirmSingleTimMapping() {
        AppMessageDeliveryOutbox outbox = outbox();
        AppMessageRecord record = record();
        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record);
        when(instantMessageProvider.send(any())).thenReturn(
                new InstantMessageSendResult("TIM-ID-1", "TIM-KEY-1", now));
        when(recordDao.selectByTimMsgKey("TIM-KEY-1")).thenReturn(null);
        when(recordDao.confirmTimMapping(20L, 0, "TIM-ID-1", "TIM-KEY-1", now)).thenReturn(1);
        when(outboxDao.markSent(10L, "TIM-KEY-1", now)).thenReturn(1);

        service.process(10L, now);

        verify(instantMessageProvider).send(org.mockito.ArgumentMatchers.argThat(command ->
                "你好".equals(command.contentText()) && command.messageRecordId().equals(20L)));
        verify(recordDao).confirmTimMapping(20L, 0, "TIM-ID-1", "TIM-KEY-1", now);
        verify(outboxDao).markSent(10L, "TIM-KEY-1", now);
        verify(whisperDao).confirmRequestDelivery(20L, now);
    }

    @Test
    @DisplayName("相同 TIM key 已属于其他消息时必须拒绝覆盖")
    void shouldRejectTimMappingCollision() {
        AppMessageDeliveryOutbox outbox = outbox();
        AppMessageRecord record = record();
        AppMessageRecord conflict = new AppMessageRecord();
        conflict.setId(99L);
        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record);
        when(instantMessageProvider.send(any())).thenReturn(
                new InstantMessageSendResult("TIM-ID-1", "TIM-KEY-1", now));
        when(recordDao.selectByTimMsgKey("TIM-KEY-1")).thenReturn(conflict);

        assertThatThrownBy(() -> service.process(10L, now))
                .isInstanceOf(InstantMessageException.class)
                .hasMessageContaining("TIM消息映射冲突");

        verify(recordDao, never()).confirmTimMapping(any(), any(Integer.class), any(), any(), any());
        verify(outboxDao).markFailure(10L, 1, true, null,
                "TIM_MAPPING_CONFLICT", "TIM消息映射冲突，禁止覆盖既有消息", now);
        verify(recordDao).markFailed(20L, 0, "TIM_MAPPING_CONFLICT",
                "TIM消息映射冲突，禁止覆盖既有消息", now);
        verify(whisperDao).failRequestDelivery(20L, "tim_delivery_failed", now);
        verify(recordDao).schedulePurgeByMessageId(20L, now);
        verify(outboxDao, never()).markSent(any(), any(), any());
    }

    @Test
    @DisplayName("可重试错误应进入退避队列且不得提前标记消息失败")
    void shouldScheduleRetryForTransientProviderFailure() {
        AppMessageDeliveryOutbox outbox = outbox();
        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record());
        when(instantMessageProvider.send(any())).thenThrow(
                new InstantMessageException("TIM_TIMEOUT", "TIM请求超时", true));
        when(outboxDao.markFailure(10L, 1, false, now.plusMinutes(1),
                "TIM_TIMEOUT", "TIM请求超时", now)).thenReturn(1);

        assertThatThrownBy(() -> service.process(10L, now))
                .isInstanceOf(InstantMessageException.class)
                .hasMessageContaining("超时");

        verify(recordDao, never()).markFailed(any(), any(Integer.class), any(), any(), any());
        verify(whisperDao, never()).failRequestDelivery(any(), any(), any());
        verify(outboxDao).markFailure(10L, 1, false, now.plusMinutes(1),
                "TIM_TIMEOUT", "TIM请求超时", now);
    }

    @Test
    @DisplayName("永久错误应进入死信并同步失败消息和悄悄话申请")
    void shouldDeadLetterPermanentProviderFailure() {
        AppMessageDeliveryOutbox outbox = outbox();
        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record());
        when(instantMessageProvider.send(any())).thenThrow(
                new InstantMessageException("TIM_FORBIDDEN", "TIM拒绝发送", false));
        when(outboxDao.markFailure(10L, 1, true, null,
                "TIM_FORBIDDEN", "TIM拒绝发送", now)).thenReturn(1);
        when(recordDao.markFailed(20L, 0, "TIM_FORBIDDEN", "TIM拒绝发送", now)).thenReturn(1);
        when(whisperDao.failRequestDelivery(20L, "tim_delivery_failed", now)).thenReturn(1);

        assertThatThrownBy(() -> service.process(10L, now))
                .isInstanceOf(InstantMessageException.class);

        verify(outboxDao).markFailure(10L, 1, true, null,
                "TIM_FORBIDDEN", "TIM拒绝发送", now);
        verify(recordDao).markFailed(20L, 0, "TIM_FORBIDDEN", "TIM拒绝发送", now);
        verify(whisperDao).failRequestDelivery(20L, "tim_delivery_failed", now);
        verify(recordDao).schedulePurgeByMessageId(20L, now);
    }

    @Test
    @DisplayName("悄悄话回复永久失败时应释放回复预占以允许接收方重试")
    void shouldReleaseReplyReservationAfterPermanentFailure() {
        AppMessageDeliveryOutbox outbox = outbox();
        outbox.setEventType("whisper_reply");
        AppMessageRecord record = record();
        record.setMessageType("whisper_reply");
        record.setSourceBizNo("WSP-1");
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(30L);
        whisper.setWhisperNo("WSP-1");
        whisper.setReplyRequestId("reply-001");
        whisper.setReplyMessageId(20L);

        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record);
        when(instantMessageProvider.send(any())).thenThrow(
                new InstantMessageException("TIM_FORBIDDEN", "TIM拒绝发送", false));
        when(outboxDao.markFailure(10L, 1, true, null,
                "TIM_FORBIDDEN", "TIM拒绝发送", now)).thenReturn(1);
        when(recordDao.markFailed(20L, 0, "TIM_FORBIDDEN", "TIM拒绝发送", now)).thenReturn(1);
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(whisper);
        when(whisperDao.releaseReplyReservation(30L, "reply-001", 20L, now)).thenReturn(1);

        assertThatThrownBy(() -> service.process(10L, now))
                .isInstanceOf(InstantMessageException.class);

        verify(whisperDao).releaseReplyReservation(30L, "reply-001", 20L, now);
        verify(recordDao).schedulePurgeByMessageId(20L, now);
        verify(whisperDao, never()).failRequestDelivery(any(), any(), any());
    }

    @Test
    @DisplayName("消息映射已成功但Outbox未确认时不得重复调用TIM")
    void shouldRecoverOutboxAfterMessageMappingWasAlreadyCommitted() {
        AppMessageDeliveryOutbox outbox = outbox();
        AppMessageRecord record = record();
        record.setSendStatus("sent");
        record.setTimMessageId("TIM-ID-OLD");
        record.setTimMsgKey("TIM-KEY-OLD");
        record.setProviderSentAt(now.minusSeconds(1));
        when(outboxDao.claim(10L, now, now.minusMinutes(10))).thenReturn(1);
        when(outboxDao.selectById(10L)).thenReturn(outbox);
        when(recordDao.selectById(20L)).thenReturn(record);
        when(outboxDao.markSent(10L, "TIM-KEY-OLD", now.minusSeconds(1))).thenReturn(1);

        service.process(10L, now);

        verifyNoInteractions(instantMessageProvider);
        verify(outboxDao).markSent(10L, "TIM-KEY-OLD", now.minusSeconds(1));
        verify(whisperDao).confirmRequestDelivery(20L, now.minusSeconds(1));
    }

    private AppMessageDeliveryOutbox outbox() {
        AppMessageDeliveryOutbox outbox = new AppMessageDeliveryOutbox();
        outbox.setId(10L);
        outbox.setAggregateType("message");
        outbox.setAggregateId(20L);
        outbox.setAggregateNo("MSG-1");
        outbox.setSenderUserId(1L);
        outbox.setReceiverUserId(2L);
        outbox.setChannel("tencent_im");
        outbox.setEventType("whisper_request");
        outbox.setProtocolVersion(1);
        outbox.setStatus("processing");
        return outbox;
    }

    private AppMessageRecord record() {
        AppMessageRecord record = new AppMessageRecord();
        record.setId(20L);
        record.setMessageNo("MSG-1");
        record.setContentText("你好");
        record.setSendStatus("queued");
        record.setVersion(0);
        return record;
    }
}
