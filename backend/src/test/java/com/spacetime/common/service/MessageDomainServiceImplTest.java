package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageTypeEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.WhisperReplyResult;
import com.spacetime.common.service.impl.MessageDomainServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("悄悄话回复、TIM 投递与匹配最终确认")
class MessageDomainServiceImplTest {

    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageConversationMemberDao memberDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageDeliveryOutboxDao outboxDao;
    @Mock private RelationDomainService relationDomainService;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private MessageDeliveryOutboxService deliveryOutboxService;
    @Mock private TransactionOperations transactionOperations;
    @Mock private TransactionStatus transactionStatus;

    private MessageDomainServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        when(transactionOperations.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });
        service = new MessageDomainServiceImpl(
                whisperDao, conversationDao, memberDao, recordDao, outboxDao,
                relationDomainService, appUserDao, relationBlockDao, accessProjectionService,
                deliveryOutboxService, transactionOperations, new ObjectMapper());
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("回复应先明文入主表和元数据Outbox，TIM成功后才创建匹配并迁移状态")
    void replyShouldDeliverBeforeCreatingMatchAndConversation() {
        AppMessageWhisper whisper = pendingWhisper();
        AppMessageRecord request = requestMessage();
        AppRelationMatch match = match();
        openPair();
        when(whisperDao.selectByReceiverReplyRequestId(2L, "reply-001")).thenReturn(null);
        when(whisperDao.selectByWhisperNoForUpdate("WSP-1")).thenReturn(whisper);
        when(recordDao.selectById(31L)).thenReturn(request);
        when(whisperDao.reserveReply(10L, 0, "reply-001", 32L, now)).thenReturn(1);
        when(relationDomainService.addMatchSource(
                1L, 2L, RelationMatchSourceTypeEnum.WHISPER_REPLY.getCode(), "WSP-1", now))
                .thenReturn(match);
        when(conversationDao.selectByMatchIdForUpdate(20L)).thenReturn(null);
        when(conversationDao.selectActivePairForUpdate(1L, 2L)).thenReturn(null);
        when(recordDao.bindConversation(eq(31L), eq(30L), any(), eq(now))).thenReturn(1);
        when(recordDao.bindConversation(eq(32L), eq(30L), any(), eq(now))).thenReturn(1);
        when(whisperDao.transitionToReplied(any(AppMessageWhisper.class), eq(1))).thenReturn(1);

        doAnswer(invocation -> {
            AppMessageRecord message = invocation.getArgument(0);
            message.setId(32L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));
        doAnswer(invocation -> {
            AppMessageDeliveryOutbox outbox = invocation.getArgument(0);
            outbox.setId(40L);
            return null;
        }).when(outboxDao).insert(any(AppMessageDeliveryOutbox.class));
        doAnswer(invocation -> {
            AppMessageConversation conversation = invocation.getArgument(0);
            conversation.setId(30L);
            return null;
        }).when(conversationDao).insert(any(AppMessageConversation.class));
        doAnswer(invocation -> {
            request.setConversationId(30L);
            request.setConversationNo("CV-1");
            return null;
        }).when(deliveryOutboxService).process(40L, now);

        AppMessageRecord sentReply = new AppMessageRecord();
        sentReply.setId(32L);
        sentReply.setMessageNo("MSG-REPLY-1");
        sentReply.setClientMsgId("reply-001");
        sentReply.setContentText("我也想认识你");
        sentReply.setSendStatus(MessageSendStatusEnum.SENT.getCode());
        sentReply.setTimMessageId("TIM-ID-2");
        sentReply.setTimMsgKey("TIM-KEY-2");
        sentReply.setSentAt(now);
        when(recordDao.selectById(32L)).thenReturn(sentReply);

        WhisperReplyResult result = service.replyWhisper(
                2L, "WSP-1", "reply-001", "我也想认识你", now);

        assertThat(result.status()).isEqualTo(MessageWhisperStatusEnum.REPLIED.getCode());
        assertThat(result.matchNo()).isEqualTo("MAT-1");
        assertThat(result.replyTimMessageId()).isEqualTo("TIM-ID-2");
        assertThat(result.replyTimMsgKey()).isEqualTo("TIM-KEY-2");

        ArgumentCaptor<AppMessageRecord> messageCaptor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getMessageType())
                .isEqualTo(MessageTypeEnum.WHISPER_REPLY.getCode());
        assertThat(messageCaptor.getValue().getContentText()).isEqualTo("我也想认识你");
        assertThat(messageCaptor.getValue().getSendStatus())
                .isEqualTo(MessageSendStatusEnum.QUEUED.getCode());

        ArgumentCaptor<AppMessageDeliveryOutbox> outboxCaptor =
                ArgumentCaptor.forClass(AppMessageDeliveryOutbox.class);
        verify(outboxDao).insert(outboxCaptor.capture());
        assertThat(outboxCaptor.getValue().getAggregateId()).isEqualTo(32L);
        assertThat(outboxCaptor.getValue().getPayloadJson()).doesNotContain("我也想认识你");

        InOrder deliveryBeforeMatch = inOrder(deliveryOutboxService, relationDomainService);
        deliveryBeforeMatch.verify(deliveryOutboxService).process(40L, now);
        deliveryBeforeMatch.verify(relationDomainService).addMatchSource(
                1L, 2L, RelationMatchSourceTypeEnum.WHISPER_REPLY.getCode(), "WSP-1", now);

        ArgumentCaptor<AppMessageConversation> conversationCaptor =
                ArgumentCaptor.forClass(AppMessageConversation.class);
        verify(conversationDao).insert(conversationCaptor.capture());
        assertThat(conversationCaptor.getValue().getConfigVersion())
                .isEqualTo("MSG-CFG-INIT-001");
    }

    @Test
    @DisplayName("TIM 投递失败时不得创建匹配或把悄悄话标记 replied")
    void deliveryFailureShouldNotCreateMatch() {
        AppMessageWhisper whisper = pendingWhisper();
        openPair();
        when(whisperDao.selectByReceiverReplyRequestId(2L, "reply-001")).thenReturn(null);
        when(whisperDao.selectByWhisperNoForUpdate("WSP-1")).thenReturn(whisper);
        when(recordDao.selectById(31L)).thenReturn(requestMessage());
        when(whisperDao.reserveReply(10L, 0, "reply-001", 32L, now)).thenReturn(1);
        doAnswer(invocation -> {
            ((AppMessageRecord) invocation.getArgument(0)).setId(32L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));
        doAnswer(invocation -> {
            ((AppMessageDeliveryOutbox) invocation.getArgument(0)).setId(40L);
            return null;
        }).when(outboxDao).insert(any(AppMessageDeliveryOutbox.class));
        doThrow(new IllegalStateException("TIM unavailable"))
                .when(deliveryOutboxService).process(40L, now);

        assertThatThrownBy(() -> service.replyWhisper(
                2L, "WSP-1", "reply-001", "我也想认识你", now))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("TIM unavailable");

        verify(relationDomainService, never()).addMatchSource(any(), any(), any(), any(), any());
        verify(whisperDao, never()).transitionToReplied(any(), any(Integer.class));
    }

    @Test
    @DisplayName("已完成请求用相同正文重试应直接返回首次结果且不重复投递")
    void completedReplayShouldReturnExistingResult() {
        AppMessageWhisper replied = pendingWhisper();
        replied.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        replied.setActiveMarker(null);
        replied.setReplyRequestId("reply-001");
        replied.setReplyMessageId(32L);
        replied.setMatchNo("MAT-1");
        replied.setConversationNo("CV-1");
        replied.setRepliedAt(now.minusMinutes(1));
        AppMessageRecord reply = sentReply("我也想认识你");
        when(whisperDao.selectByReceiverReplyRequestId(2L, "reply-001")).thenReturn(replied);
        when(recordDao.selectById(32L)).thenReturn(reply);

        WhisperReplyResult result = service.replyWhisper(
                2L, "WSP-1", "reply-001", "我也想认识你", now);

        assertThat(result.conversationNo()).isEqualTo("CV-1");
        assertThat(result.replyTimMsgKey()).isEqualTo("TIM-KEY-2");
        verify(deliveryOutboxService, never()).process(any(), any());
        verify(relationDomainService, never()).addMatchSource(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("相同幂等键携带不同正文必须返回30020")
    void replayWithDifferentBodyShouldBeRejected() {
        AppMessageWhisper replied = pendingWhisper();
        replied.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        replied.setReplyRequestId("reply-001");
        replied.setReplyMessageId(32L);
        when(whisperDao.selectByReceiverReplyRequestId(2L, "reply-001")).thenReturn(replied);
        when(recordDao.selectById(32L)).thenReturn(sentReply("首次正文"));

        assertThatThrownBy(() -> service.replyWhisper(
                2L, "WSP-1", "reply-001", "不同正文", now))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo(30020));
        verify(deliveryOutboxService, never()).process(any(), any());
    }

    @Test
    @DisplayName("已过期待回复申请不得预占消息或创建Outbox")
    void expiredWhisperShouldBeRejectedBeforeReservation() {
        AppMessageWhisper whisper = pendingWhisper();
        whisper.setExpiresAt(now.minusSeconds(1));
        when(whisperDao.selectByReceiverReplyRequestId(2L, "reply-001")).thenReturn(null);
        when(whisperDao.selectByWhisperNoForUpdate("WSP-1")).thenReturn(whisper);

        assertThatThrownBy(() -> service.replyWhisper(
                2L, "WSP-1", "reply-001", "我也想认识你", now))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("已结束");

        verify(recordDao, never()).insert(any());
        verify(outboxDao, never()).insert(any());
    }

    private void openPair() {
        AppUser sender = new AppUser();
        sender.setId(1L);
        AppUser receiver = new AppUser();
        receiver.setId(2L);
        when(appUserDao.selectById(1L)).thenReturn(sender);
        when(appUserDao.selectById(2L)).thenReturn(receiver);
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("OPEN");
    }

    private AppMessageWhisper pendingWhisper() {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(10L);
        whisper.setWhisperNo("WSP-1");
        whisper.setSenderUserId(1L);
        whisper.setReceiverUserId(2L);
        whisper.setUserLowId(1L);
        whisper.setUserHighId(2L);
        whisper.setStatus(MessageWhisperStatusEnum.PENDING.getCode());
        whisper.setActiveMarker(1);
        whisper.setDeliveryStatus(MessageDeliveryStatusEnum.SENT.getCode());
        whisper.setExpiresAt(now.plusDays(1));
        whisper.setRequestMessageId(31L);
        whisper.setVersion(0);
        return whisper;
    }

    private AppMessageRecord requestMessage() {
        AppMessageRecord request = new AppMessageRecord();
        request.setId(31L);
        request.setMessageNo("MSG-REQUEST-1");
        request.setMessageType(MessageTypeEnum.WHISPER.getCode());
        request.setSendStatus(MessageSendStatusEnum.SENT.getCode());
        request.setTimMessageId("TIM-ID-1");
        request.setTimMsgKey("TIM-KEY-1");
        request.setSentAt(now.minusHours(1));
        return request;
    }

    private AppMessageRecord sentReply(String content) {
        AppMessageRecord reply = new AppMessageRecord();
        reply.setId(32L);
        reply.setMessageNo("MSG-REPLY-1");
        reply.setClientMsgId("reply-001");
        reply.setContentText(content);
        reply.setMessageType(MessageTypeEnum.WHISPER_REPLY.getCode());
        reply.setSourceBizNo("WSP-1");
        reply.setSendStatus(MessageSendStatusEnum.SENT.getCode());
        reply.setTimMessageId("TIM-ID-2");
        reply.setTimMsgKey("TIM-KEY-2");
        reply.setSentAt(now.minusMinutes(1));
        return reply;
    }

    private AppRelationMatch match() {
        AppRelationMatch match = new AppRelationMatch();
        match.setId(20L);
        match.setMatchNo("MAT-1");
        match.setUserLowId(1L);
        match.setUserHighId(2L);
        return match;
    }
}
