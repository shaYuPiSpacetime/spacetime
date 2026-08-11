package com.spacetime.common.service;

import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.AccountStatusMessageNotificationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountStatusMessageNotificationServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 12, 34, 56);

    @Mock private MessageEventPublisher eventPublisher;
    @Mock private MessageEventInboxService inboxService;
    @Mock private AfterCommitExecutor afterCommitExecutor;

    @Test
    void cancellingStatusShouldPublishSafetyMessageAfterCommit() {
        doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(afterCommitExecutor).execute(any());
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(71L);
        AccountStatusMessageNotificationServiceImpl service = service();

        service.publishAfterCommit(8L, AccountStatusEnum.CANCELLING.getCode(), NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("prd01");
        assertThat(event.producerEventId()).isEqualTo("account-status:8:CANCELLING:20260810123456");
        assertThat(event.receiverUserId()).isEqualTo(8L);
        assertThat(event.templateCode()).isEqualTo("account_security");
        assertThat(event.bizType()).isEqualTo("account_security");
        assertThat(event.variables().get("result")).isEqualTo("注销申请已提交，账号已进入冷静期");
        verify(inboxService).process(71L, NOW);
    }

    @Test
    void normalStatusShouldNotGenerateRestrictedSecurityMessage() {
        assertThat(service().publishNow(8L, AccountStatusEnum.NORMAL.getCode(), NOW)).isFalse();
        verify(eventPublisher, never()).publishSystemMessage(any(), any());
    }

    private AccountStatusMessageNotificationServiceImpl service() {
        return new AccountStatusMessageNotificationServiceImpl(
                eventPublisher, inboxService, afterCommitExecutor);
    }
}
