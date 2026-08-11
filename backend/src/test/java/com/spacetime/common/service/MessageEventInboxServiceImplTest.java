package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.service.impl.MessageEventInboxServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("消息事件 Inbox 可靠消费")
class MessageEventInboxServiceImplTest {
    @Mock private AppMessageEventInboxDao inboxDao;
    @Mock private MessageEventHandler eventHandler;

    private MessageEventInboxServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MessageEventInboxServiceImpl(inboxDao, List.of(eventHandler));
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("消费成功应与 success 状态一起清空临时载荷")
    void successShouldClearTemporaryPayload() {
        AppMessageEventInbox inbox = inbox();
        when(inboxDao.claim(1L, now, now.minusMinutes(10))).thenReturn(1);
        when(inboxDao.selectById(1L)).thenReturn(inbox);
        when(eventHandler.supports("prd04", "asset_changed")).thenReturn(true);
        when(inboxDao.markSuccessAndClearPayload(1L, now)).thenReturn(1);

        service.process(1L, now);

        verify(eventHandler).handle(inbox);
        verify(inboxDao).markSuccessAndClearPayload(1L, now);
    }

    @Test
    @DisplayName("未认领到事件时不得重复处理或清理载荷")
    void failedClaimShouldDoNothing() {
        when(inboxDao.claim(1L, now, now.minusMinutes(10))).thenReturn(0);

        service.process(1L, now);

        verify(inboxDao, never()).selectById(1L);
        verify(eventHandler, never()).handle(org.mockito.ArgumentMatchers.any());
        verify(inboxDao, never()).markSuccessAndClearPayload(1L, now);
    }

    @Test
    @DisplayName("消费失败应采用统一的第一段一分钟退避")
    void failedProcessingShouldUseConfirmedRetrySchedule() {
        AppMessageEventInbox inbox = inbox();
        when(inboxDao.claim(1L, now, now.minusMinutes(10))).thenReturn(1);
        when(inboxDao.selectById(1L)).thenReturn(inbox);
        when(eventHandler.supports("prd04", "asset_changed")).thenReturn(true);
        doThrow(new IllegalStateException("temporary failure")).when(eventHandler).handle(inbox);

        assertThatThrownBy(() -> service.process(1L, now))
                .isInstanceOf(IllegalStateException.class);

        verify(inboxDao).markFailure(1L, 1, false, now.plusMinutes(1),
                "IllegalStateException", "temporary failure", now);
    }

    private AppMessageEventInbox inbox() {
        AppMessageEventInbox inbox = new AppMessageEventInbox();
        inbox.setId(1L);
        inbox.setSourceModule("prd04");
        inbox.setEventType("asset_changed");
        inbox.setStatus("processing");
        inbox.setPayloadCiphertext(new byte[]{1});
        return inbox;
    }
}
