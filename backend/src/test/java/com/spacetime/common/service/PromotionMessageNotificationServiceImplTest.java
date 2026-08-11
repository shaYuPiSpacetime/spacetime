package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.PromotionMessageNotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionMessageNotificationServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 12, 0);

    @Mock private MessageEventPublisher eventPublisher;
    @Mock private MessageEventInboxService inboxService;

    private PromotionMessageNotificationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PromotionMessageNotificationServiceImpl(eventPublisher, inboxService);
    }

    @Test
    void shouldPublishSuccessfulRewardResult() {
        PromotionRewardLog reward = reward("success", 0, null);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(81L);

        assertThat(service.publishRewardResult(reward, NOW)).isTrue();

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("prd07");
        assertThat(event.producerEventId()).isEqualTo("IRW-1:success");
        assertThat(event.receiverUserId()).isEqualTo(7L);
        assertThat(event.bizNo()).isEqualTo("IRW-1");
        assertThat(event.templateCode()).isEqualTo("invite_result");
        assertThat(event.bizType()).isEqualTo("invite_result");
        assertThat(event.variables()).containsEntry(
                "result", "注册奖励已发放，获得20千寻币");
        verify(inboxService).process(81L, NOW);
    }

    @Test
    void shouldOnlyPublishFailureAfterAutomaticRetriesAreExhausted() {
        PromotionRewardLog retrying = reward("failed", 2, NOW.plusMinutes(30));

        assertThat(service.publishRewardResult(retrying, NOW)).isFalse();

        verify(eventPublisher, never()).publishSystemMessage(any(), any());

        PromotionRewardLog terminal = reward("failed", 4, null);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(82L);

        assertThat(service.publishRewardResult(terminal, NOW)).isTrue();
        verify(inboxService).process(82L, NOW);
    }

    private PromotionRewardLog reward(String status, int retryCount,
                                      LocalDateTime nextRetryTime) {
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setId(1L);
        reward.setRewardNo("IRW-1");
        reward.setInviterId(7L);
        reward.setEventLabelSnapshot("注册奖励");
        reward.setAmount(new BigDecimal("20.00"));
        reward.setStatus(status);
        reward.setRetryCount(retryCount);
        reward.setNextRetryTime(nextRetryTime);
        return reward;
    }
}
