package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.TencentImProperties;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.model.message.TencentImCallbackRequest;
import com.spacetime.common.model.message.TencentImCallbackResponse;
import com.spacetime.common.service.RelationAccessProjectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class TencentImCallbackServiceImplTest {
    private static final long REQUEST_TIME = 1786334400L;
    private static final String PATH_TOKEN = "callback-path-token";
    private static final String AUTH_TOKEN = "callback-auth-token";

    @Mock private AppUserImAccountDao accountDao;
    @Mock private AppUserDao userDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageConversationMemberDao memberDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private AppMessageRuntimeControlDao runtimeControlDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageDeliveryOutboxDao outboxDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private TransactionOperations transactionOperations;
    @Mock private TransactionStatus transactionStatus;

    private TencentImCallbackServiceImpl service;

    @BeforeEach
    void setUp() {
        TencentImProperties properties = new TencentImProperties();
        properties.setEnabled(true);
        properties.setSdkAppId(1400000001L);
        properties.setCallbackPathToken(PATH_TOKEN);
        properties.setCallbackAuthToken(AUTH_TOKEN);
        lenient().when(transactionOperations.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });
        service = new TencentImCallbackServiceImpl(
                properties, new ObjectMapper(), accountDao, userDao, accessProjectionService,
                matchDao, conversationDao, memberDao, relationBlockDao, runtimeControlDao, recordDao,
                outboxDao, whisperDao, transactionOperations,
                Clock.fixed(Instant.ofEpochSecond(REQUEST_TIME), ZoneId.of("UTC")));
    }

    @Test
    void shouldRejectInvalidSignatureBeforeReadingBusinessData() {
        TencentImCallbackResponse response = service.handle(request(
                "C2C.CallbackBeforeSendMsg", "invalid", textBody("C2C.CallbackBeforeSendMsg")));

        assertThat(response.errorCode()).isEqualTo(1);
        assertThat(response.actionStatus()).isEqualTo("FAIL");
        verifyNoInteractions(accountDao, userDao, matchDao, conversationDao, recordDao);
    }

    @Test
    void shouldAllowMatchedUsersToSendOrdinaryText() {
        openTextConversation(false);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackBeforeSendMsg", textBody("C2C.CallbackBeforeSendMsg")));

        assertThat(response.errorCode()).isZero();
        assertThat(response.actionStatus()).isEqualTo("OK");
    }

    @Test
    void shouldRejectRichMediaThatIsNotEnabledInFirstRelease() {
        openAccounts();
        AppMessageRuntimeControl control = new AppMessageRuntimeControl();
        control.setEnabled(1);
        when(runtimeControlDao.selectByControlKey("global_send_enabled")).thenReturn(control);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackBeforeSendMsg", imageBody("C2C.CallbackBeforeSendMsg")));

        assertThat(response.errorCode()).isEqualTo(120008);
        assertThat(response.errorInfo()).contains("30008").contains("当前消息类型未开放");
        verify(recordDao, never()).insert(any(AppMessageRecord.class));
    }

    @Test
    void shouldReturnTencentCustomCodeWhenMaleIsBlockedByFemaleProtection() {
        openTextConversation(true);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackBeforeSendMsg", textBody("C2C.CallbackBeforeSendMsg")));

        assertThat(response.errorCode()).isEqualTo(120003);
        assertThat(response.errorInfo()).contains("30003");
    }

    @Test
    void shouldArchiveOrdinaryTextOnceAndUpdateConversationProjection() {
        openAccountsAndConversation(false);
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(null);
        when(conversationDao.touchMessage(eq(30L), eq(501L), any(LocalDateTime.class), eq(false)))
                .thenReturn(1);
        org.mockito.Mockito.doAnswer(invocation -> {
            AppMessageRecord record = invocation.getArgument(0);
            record.setId(501L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        ArgumentCaptor<AppMessageRecord> captor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(captor.capture());
        AppMessageRecord saved = captor.getValue();
        assertThat(saved.getContentText()).isEqualTo("你好，认识一下");
        assertThat(saved.getMessageType()).isEqualTo("text");
        assertThat(saved.getSendStatus()).isEqualTo("sent");
        assertThat(saved.getTimMessageId()).isEqualTo("msg-id-1");
        assertThat(saved.getTimMsgKey()).isEqualTo("msg-key-1");
        assertThat(saved.getConversationId()).isEqualTo(30L);
        verify(conversationDao).touchMessage(eq(30L), eq(501L), any(LocalDateTime.class), eq(false));
    }

    @Test
    void shouldTreatRepeatedAfterCallbackAsSuccessWithoutRepeatingProjection() {
        openAccountsAndConversation(false);
        AppMessageRecord existing = new AppMessageRecord();
        existing.setId(501L);
        existing.setSenderUserId(11L);
        existing.setReceiverUserId(22L);
        existing.setConversationId(30L);
        existing.setTimMsgKey("msg-key-1");
        existing.setTimMessageId("msg-id-1");
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(existing);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        verify(recordDao, never()).insert(any(AppMessageRecord.class));
        verify(conversationDao, never()).touchMessage(any(), any(), any(), eq(false));
    }

    @Test
    void shouldAdvancePlatformUnreadProjectionAfterConversationReadReport() {
        openAccounts();
        AppMessageConversation conversation = new AppMessageConversation();
        conversation.setId(30L);
        conversation.setConversationNo("CV-1");
        when(conversationDao.selectPairAtMessageTimeForUpdate(eq(11L), eq(22L),
                any(LocalDateTime.class))).thenReturn(conversation);
        when(memberDao.advanceReadWatermark(eq(30L), eq(22L),
                any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(1);
        when(recordDao.markReadThroughTime(eq(30L), eq(22L), eq(11L),
                any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(2);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterMsgReport", readReportBody()));

        assertThat(response.errorCode()).isZero();
        verify(memberDao).advanceReadWatermark(eq(30L), eq(22L),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0)),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0, 1)));
        verify(recordDao).markReadThroughTime(eq(30L), eq(22L), eq(11L),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0)),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0, 1)));
    }

    @Test
    void shouldApplyDelayedReadReportOnlyToLifecycleCoveredByReadTime() {
        openAccounts();
        AppMessageConversation oldConversation = new AppMessageConversation();
        oldConversation.setId(29L);
        oldConversation.setConversationNo("CV-OLD");
        oldConversation.setStatus("invalid");
        when(conversationDao.selectPairAtMessageTimeForUpdate(eq(11L), eq(22L),
                any(LocalDateTime.class))).thenReturn(oldConversation);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterMsgReport", readReportBody()));

        assertThat(response.errorCode()).isZero();
        verify(memberDao).advanceReadWatermark(eq(29L), eq(22L),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0)), any(LocalDateTime.class));
        verify(recordDao).markReadThroughTime(eq(29L), eq(22L), eq(11L),
                eq(LocalDateTime.of(2026, 8, 10, 12, 0)), any(LocalDateTime.class));
    }

    @Test
    void shouldArchiveDelayedMessageAsReadWhenReadWatermarkAlreadyCoversIt() {
        openAccountsAndConversation(false);
        AppMessageConversationMember receiverMember = new AppMessageConversationMember();
        receiverMember.setConversationId(30L);
        receiverMember.setUserId(22L);
        receiverMember.setLastReadMessageTime(LocalDateTime.of(2026, 8, 10, 12, 0));
        receiverMember.setLastReadAt(LocalDateTime.of(2026, 8, 10, 12, 0, 1));
        when(memberDao.selectByConversationAndUserForUpdate(30L, 22L)).thenReturn(receiverMember);
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(null);
        when(conversationDao.touchMessage(eq(30L), eq(501L), any(LocalDateTime.class), eq(false)))
                .thenReturn(1);
        org.mockito.Mockito.doAnswer(invocation -> {
            AppMessageRecord record = invocation.getArgument(0);
            record.setId(501L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        ArgumentCaptor<AppMessageRecord> captor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(captor.capture());
        assertThat(captor.getValue().getReceiverReadStatus()).isEqualTo("read");
        assertThat(captor.getValue().getReceiverReadAt())
                .isEqualTo(LocalDateTime.of(2026, 8, 10, 12, 0, 1));
    }

    @Test
    void shouldRejectActiveArchiveWhenReceiverMemberMappingIsMissing() {
        openAccountsAndConversation(false);
        when(memberDao.selectByConversationAndUserForUpdate(30L, 22L)).thenReturn(null);
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(null);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isEqualTo(1);
        assertThat(response.actionStatus()).isEqualTo("FAIL");
        verify(recordDao, never()).insert(any(AppMessageRecord.class));
        verify(conversationDao, never()).touchMessage(any(), any(), any(), eq(false));
    }

    @Test
    void shouldIsolateAfterSendCallbackWhenConversationAlreadyBecameTerminal() {
        openAccounts();
        AppMessageConversation terminal = new AppMessageConversation();
        terminal.setId(30L);
        terminal.setConversationNo("CV-1");
        terminal.setStatus("invalid");
        terminal.setPurgeAfter(LocalDateTime.of(2027, 2, 6, 12, 0));
        when(conversationDao.selectPairAtMessageTimeForUpdate(eq(11L), eq(22L),
                any(LocalDateTime.class))).thenReturn(terminal);
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(null);
        org.mockito.Mockito.doAnswer(invocation -> {
            AppMessageRecord record = invocation.getArgument(0);
            record.setId(501L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        ArgumentCaptor<AppMessageRecord> captor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(captor.capture());
        assertThat(captor.getValue().getReceiverReadStatus()).isEqualTo("not_applicable");
        assertThat(captor.getValue().getIsolatedAt()).isNotNull();
        assertThat(captor.getValue().getPurgeAfter()).isEqualTo(terminal.getPurgeAfter());
        verify(conversationDao, never()).touchMessage(any(), any(), any(), eq(false));
    }

    @Test
    void shouldBindDelayedAfterCallbackToOldLifecycleInsteadOfNewActiveConversation() {
        openAccounts();
        AppMessageConversation oldTerminal = new AppMessageConversation();
        oldTerminal.setId(29L);
        oldTerminal.setConversationNo("CV-OLD");
        oldTerminal.setStatus("invalid");
        oldTerminal.setPurgeAfter(LocalDateTime.of(2027, 2, 6, 12, 0));
        when(conversationDao.selectPairAtMessageTimeForUpdate(eq(11L), eq(22L),
                any(LocalDateTime.class))).thenReturn(oldTerminal);
        when(recordDao.selectByTimMsgKey("msg-key-1")).thenReturn(null);
        org.mockito.Mockito.doAnswer(invocation -> {
            AppMessageRecord record = invocation.getArgument(0);
            record.setId(501L);
            return null;
        }).when(recordDao).insert(any(AppMessageRecord.class));

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", textBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        ArgumentCaptor<AppMessageRecord> captor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(captor.capture());
        assertThat(captor.getValue().getConversationId()).isEqualTo(29L);
        assertThat(captor.getValue().getConversationNo()).isEqualTo("CV-OLD");
        assertThat(captor.getValue().getIsolatedAt()).isNotNull();
        verify(conversationDao, never()).touchMessage(any(), any(), any(), eq(false));
    }

    @Test
    void shouldConfirmWhisperMappingWithoutCopyingBodyToOutbox() {
        openAccounts();
        AppMessageRecord record = new AppMessageRecord();
        record.setId(601L);
        record.setMessageNo("MSG-WSP-1");
        record.setSenderUserId(11L);
        record.setReceiverUserId(22L);
        record.setMessageType("whisper");
        record.setContentText("认真认识一下");
        record.setSendStatus("queued");
        record.setSourceBizNo("WSP-1");
        record.setVersion(0);
        AppMessageDeliveryOutbox outbox = new AppMessageDeliveryOutbox();
        outbox.setId(701L);
        outbox.setAggregateType("message");
        outbox.setAggregateId(601L);
        outbox.setSenderUserId(11L);
        outbox.setReceiverUserId(22L);
        outbox.setEventType("whisper_request");
        outbox.setPayloadJson("{\"whisperNo\":\"WSP-1\"}");
        outbox.setStatus("processing");
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(801L);
        whisper.setWhisperNo("WSP-1");
        whisper.setRequestMessageId(601L);
        whisper.setStatus("pending");

        when(recordDao.selectByMessageNo("MSG-WSP-1")).thenReturn(record);
        when(recordDao.selectByTimMsgKey("msg-key-2")).thenReturn(null);
        when(recordDao.confirmTimMapping(eq(601L), eq(0), eq("msg-id-2"),
                eq("msg-key-2"), any(LocalDateTime.class))).thenReturn(1);
        when(outboxDao.selectByAggregate("message", 601L, "tencent_im")).thenReturn(outbox);
        when(outboxDao.confirmCallback(eq(701L), eq("msg-key-2"), any(LocalDateTime.class)))
                .thenReturn(1);
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(whisper);
        when(whisperDao.confirmRequestDelivery(eq(601L), any(LocalDateTime.class))).thenReturn(1);

        TencentImCallbackResponse response = service.handle(signedRequest(
                "C2C.CallbackAfterSendMsg", whisperBody("C2C.CallbackAfterSendMsg")));

        assertThat(response.errorCode()).isZero();
        verify(recordDao, never()).insert(any(AppMessageRecord.class));
        verify(outboxDao).confirmCallback(eq(701L), eq("msg-key-2"), any(LocalDateTime.class));
        assertThat(outbox.getPayloadJson()).doesNotContain("认真认识一下");
    }

    private void openTextConversation(boolean femaleProtection) {
        openAccountsAndConversation(femaleProtection);
        AppMessageRuntimeControl control = new AppMessageRuntimeControl();
        control.setEnabled(1);
        when(runtimeControlDao.selectByControlKey("global_send_enabled")).thenReturn(control);
        AppRelationMatch match = new AppRelationMatch();
        match.setId(20L);
        match.setMatchStatus("matched");
        when(matchDao.selectActivePair(11L, 22L)).thenReturn(match);
    }

    private void openAccountsAndConversation(boolean femaleProtection) {
        openAccounts();
        AppMessageConversation conversation = new AppMessageConversation();
        conversation.setId(30L);
        conversation.setConversationNo("CV-1");
        conversation.setMatchId(20L);
        conversation.setStatus("active");
        conversation.setActiveMarker(1);
        conversation.setProtectionEnabled(femaleProtection ? 1 : 0);
        conversation.setMaleUserId(11L);
        conversation.setFemaleUserId(22L);
        conversation.setProtectionUntil(LocalDateTime.of(2026, 8, 13, 12, 0));
        lenient().when(conversationDao.selectActivePair(11L, 22L)).thenReturn(conversation);
        lenient().when(conversationDao.selectPairAtMessageTimeForUpdate(eq(11L), eq(22L),
                any(LocalDateTime.class))).thenReturn(conversation);
        AppMessageConversationMember receiverMember = new AppMessageConversationMember();
        receiverMember.setConversationId(30L);
        receiverMember.setConversationNo("CV-1");
        receiverMember.setUserId(22L);
        receiverMember.setPeerUserId(11L);
        lenient().when(memberDao.selectByConversationAndUserForUpdate(30L, 22L))
                .thenReturn(receiverMember);
    }

    private void openAccounts() {
        AppUserImAccount senderAccount = new AppUserImAccount();
        senderAccount.setUserId(11L);
        senderAccount.setImUserId("im-a");
        AppUserImAccount receiverAccount = new AppUserImAccount();
        receiverAccount.setUserId(22L);
        receiverAccount.setImUserId("im-b");
        when(accountDao.selectByImUserId("im-a")).thenReturn(senderAccount);
        when(accountDao.selectByImUserId("im-b")).thenReturn(receiverAccount);

        AppUser sender = new AppUser();
        sender.setId(11L);
        sender.setGender("MALE");
        AppUser receiver = new AppUser();
        receiver.setId(22L);
        receiver.setGender("FEMALE");
        lenient().when(userDao.selectById(11L)).thenReturn(sender);
        lenient().when(userDao.selectById(22L)).thenReturn(receiver);
        lenient().when(accessProjectionService.project(sender)).thenReturn("OPEN");
        lenient().when(accessProjectionService.project(receiver)).thenReturn("OPEN");
    }

    private TencentImCallbackRequest signedRequest(String command, String body) {
        return request(command, signature(), body);
    }

    private TencentImCallbackRequest request(String command, String signature, String body) {
        return new TencentImCallbackRequest(PATH_TOKEN, 1400000001L, command, REQUEST_TIME,
                signature, "RESTAPI", body);
    }

    private String textBody(String command) {
        return """
                {"CallbackCommand":"%s","From_Account":"im-a","To_Account":"im-b",
                 "MsgSeq":100,"MsgRandom":200,"MsgTime":1786334400,
                 "MsgKey":"msg-key-1","MsgId":"msg-id-1","SendMsgResult":0,
                 "MsgBody":[{"MsgType":"TIMTextElem","MsgContent":{"Text":"你好，认识一下"}}]}
                """.formatted(command);
    }

    private String imageBody(String command) {
        return """
                {"CallbackCommand":"%s","From_Account":"im-a","To_Account":"im-b",
                 "MsgSeq":102,"MsgRandom":202,"MsgTime":1786334400,
                 "MsgKey":"msg-key-image","MsgId":"msg-id-image","SendMsgResult":0,
                 "MsgBody":[{"MsgType":"TIMImageElem","MsgContent":{"UUID":"image-id"}}]}
                """.formatted(command);
    }

    private String readReportBody() {
        return """
                {"CallbackCommand":"C2C.CallbackAfterMsgReport",
                 "Report_Account":"im-b","Peer_Account":"im-a",
                 "LastReadTime":1786334400,"EventTime":1786334401000}
                """;
    }

    private String whisperBody(String command) {
        String cloudData = "{\"messageNo\":\"MSG-WSP-1\",\"messageType\":\"whisper_request\"," +
                "\"protocolVersion\":1,\"whisperNo\":\"WSP-1\"}";
        String customData = "{\"messageNo\":\"MSG-WSP-1\",\"messageType\":\"whisper_request\"," +
                "\"protocolVersion\":1,\"whisperNo\":\"WSP-1\",\"content\":\"认真认识一下\"}";
        try {
            ObjectMapper mapper = new ObjectMapper();
            var root = mapper.createObjectNode();
            root.put("CallbackCommand", command);
            root.put("From_Account", "im-a");
            root.put("To_Account", "im-b");
            root.put("MsgSeq", 101);
            root.put("MsgRandom", 201);
            root.put("MsgTime", 1786334400);
            root.put("MsgKey", "msg-key-2");
            root.put("MsgId", "msg-id-2");
            root.put("SendMsgResult", 0);
            root.put("CloudCustomData", cloudData);
            var element = root.putArray("MsgBody").addObject();
            element.put("MsgType", "TIMCustomElem");
            element.putObject("MsgContent").put("Data", customData);
            return mapper.writeValueAsString(root);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String signature() {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(
                    (AUTH_TOKEN + REQUEST_TIME).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
