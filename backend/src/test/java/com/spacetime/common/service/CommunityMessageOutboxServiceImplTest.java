package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.CommunityMessageOutboxDao;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.CommunityMessageOutboxServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("社区事件转系统消息")
class CommunityMessageOutboxServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 12, 0);

    @Mock private CommunityMessageOutboxDao outboxDao;
    @Mock private MessageEventPublisher eventPublisher;

    private CommunityMessageOutboxServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CommunityMessageOutboxServiceImpl(
                outboxDao, eventPublisher, new ObjectMapper());
    }

    @Test
    @DisplayName("举报处理结果生成治理类系统消息且不携带后台备注")
    void shouldPublishReportResult() {
        CommunityEventOutbox outbox = outbox(1L, "EVT-REPORT-1", "report_result", "report",
                "RPT-1", "{\"recipientUserId\":8,\"reportNo\":\"RPT-1\","
                        + "\"result\":\"valid\",\"handleRemark\":\"内部处理备注\"}", 0);
        when(outboxDao.claim(eq(1L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(1L)).thenReturn(outbox);
        when(outboxDao.markSent(1L, NOW)).thenReturn(1);

        service.process(1L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("prd05");
        assertThat(event.producerEventId()).isEqualTo("EVT-REPORT-1");
        assertThat(event.receiverUserId()).isEqualTo(8L);
        assertThat(event.bizNo()).isEqualTo("RPT-1");
        assertThat(event.templateCode()).isEqualTo("report_result");
        assertThat(event.bizType()).isEqualTo("report_result");
        assertThat(event.variables()).containsEntry("result", "举报成立")
                .doesNotContainKeys("handleRemark", "reason");
        verify(outboxDao).markSent(1L, NOW);
    }

    @Test
    @DisplayName("动态审核结果生成内容审核系统消息")
    void shouldPublishContentReviewResult() {
        CommunityEventOutbox outbox = outbox(2L, "EVT-POST-1", "moderation_result", "post",
                "POST-1", "{\"recipientUserId\":9,\"bizNo\":\"POST-1\","
                        + "\"result\":\"rejected\",\"reason\":\"后台审核说明\"}", 0);
        when(outboxDao.claim(eq(2L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(2L)).thenReturn(outbox);
        when(outboxDao.markSent(2L, NOW)).thenReturn(1);

        service.process(2L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.templateCode()).isEqualTo("content_review_result");
        assertThat(event.bizType()).isEqualTo("content_review_result");
        assertThat(event.variables()).containsEntry("contentType", "动态")
                .containsEntry("result", "审核未通过")
                .doesNotContainKey("reason");
        verify(outboxDao).markSent(2L, NOW);
    }

    @Test
    @DisplayName("举报处罚结果只向被处理用户生成必要安全消息")
    void shouldPublishViolationResult() {
        CommunityEventOutbox outbox = outbox(3L, "EVT-PUNISH-1", "moderation_result", "report",
                "RPT-2", "{\"recipientUserId\":10,\"bizNo\":\"RPT-2\","
                        + "\"result\":\"freeze_user\",\"reason\":\"风控细节\"}", 0);
        when(outboxDao.claim(eq(3L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(3L)).thenReturn(outbox);
        when(outboxDao.markSent(3L, NOW)).thenReturn(1);

        service.process(3L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.templateCode()).isEqualTo("violation_result");
        assertThat(event.bizType()).isEqualTo("violation_result");
        assertThat(event.variables()).containsOnlyKeys("result")
                .containsEntry("result", "账号已被冻结");
        verify(outboxDao).markSent(3L, NOW);
    }

    @Test
    @DisplayName("社区聚合事件按稳定窗口业务号生成社区系统消息")
    void shouldPublishCommunityInteractionSummary() {
        CommunityEventOutbox outbox = outbox(6L, "EVT-INTERACTION-1",
                "community_interaction_summary", "interaction_window", "IW-1",
                "{\"recipientUserId\":13,\"bizNo\":\"IW-1\","
                        + "\"summary\":\"你的动态新增3条评论和8个赞\"}", 0);
        when(outboxDao.claim(eq(6L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(6L)).thenReturn(outbox);
        when(outboxDao.markSent(6L, NOW)).thenReturn(1);

        service.process(6L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("community");
        assertThat(event.producerEventId()).isEqualTo("EVT-INTERACTION-1");
        assertThat(event.templateCode()).isEqualTo("community_interaction_summary");
        assertThat(event.bizType()).isEqualTo("community_interaction_summary");
        assertThat(event.variables()).containsOnlyKeys("summary")
                .containsEntry("summary", "你的动态新增3条评论和8个赞");
    }

    @Test
    @DisplayName("发布失败按指数退避重试并保留社区业务事实")
    void shouldRetryFailedPublishing() {
        CommunityEventOutbox outbox = outbox(4L, "EVT-REPORT-2", "report_result", "report",
                "RPT-3", "{\"recipientUserId\":11,\"result\":\"invalid\"}", 0);
        when(outboxDao.claim(eq(4L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(4L)).thenReturn(outbox);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW)))
                .thenThrow(new IllegalStateException("temporary failure"));

        assertThatThrownBy(() -> service.process(4L, NOW))
                .isInstanceOf(IllegalStateException.class);

        verify(outboxDao).markFailure(4L, 1, false, NOW.plusMinutes(1),
                "temporary failure", NOW);
    }

    @Test
    @DisplayName("连续失败达到上限后进入死信且不再安排重试")
    void shouldDeadLetterAfterRetryLimit() {
        CommunityEventOutbox outbox = outbox(5L, "EVT-REPORT-3", "report_result", "report",
                "RPT-4", "{\"recipientUserId\":12,\"result\":\"valid\"}", 7);
        when(outboxDao.claim(eq(5L), eq(NOW), any())).thenReturn(1);
        when(outboxDao.selectById(5L)).thenReturn(outbox);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW)))
                .thenThrow(new IllegalArgumentException("permanent failure"));

        assertThatThrownBy(() -> service.process(5L, NOW))
                .isInstanceOf(IllegalArgumentException.class);

        verify(outboxDao).markFailure(5L, 8, true, null,
                "permanent failure", NOW);
    }

    private CommunityEventOutbox outbox(Long id, String eventNo, String eventType,
                                         String aggregateType, String aggregateNo,
                                         String payload, int retryCount) {
        CommunityEventOutbox outbox = new CommunityEventOutbox();
        outbox.setId(id);
        outbox.setEventNo(eventNo);
        outbox.setEventType(eventType);
        outbox.setAggregateType(aggregateType);
        outbox.setAggregateNo(aggregateNo);
        outbox.setAggregateVersion(1);
        outbox.setPayload(payload);
        outbox.setStatus("pending");
        outbox.setRetryCount(retryCount);
        return outbox;
    }
}
