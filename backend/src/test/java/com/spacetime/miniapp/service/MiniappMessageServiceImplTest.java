package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.model.message.WhisperReplyResult;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MessageDomainService;
import com.spacetime.common.service.MessageAnnouncementHydrationService;
import com.spacetime.common.service.MessageNotificationDomainService;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.AssistantMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.ConversationBlockReq;
import com.spacetime.miniapp.dto.request.MessageReadReq;
import com.spacetime.miniapp.dto.request.SystemMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReplyReq;
import com.spacetime.miniapp.dto.response.MessageConversationDetailVO;
import com.spacetime.miniapp.dto.response.MessageConversationPageVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.AssistantMessagePageVO;
import com.spacetime.miniapp.dto.response.ConversationBlockVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.MessageReadBatchVO;
import com.spacetime.miniapp.dto.response.MessageReadVO;
import com.spacetime.miniapp.dto.response.MessageUnreadSummaryVO;
import com.spacetime.miniapp.dto.response.SystemMessagePageVO;
import com.spacetime.miniapp.dto.response.WhisperReplyVO;
import com.spacetime.miniapp.service.impl.MiniappMessageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("移动端悄悄话状态与 TIM 会话映射查询")
class MiniappMessageServiceImplTest {

    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageConversationMemberDao memberDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserImAccountDao imAccountDao;
    @Mock private AppAssistantMessageDao assistantMessageDao;
    @Mock private AppSystemMessageDao systemMessageDao;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private MessageDomainService messageDomainService;
    @Mock private MessageAnnouncementHydrationService announcementHydrationService;
    @Mock private MessageNotificationDomainService notificationDomainService;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private MiniappSettingService settingService;
    @Mock private SensitiveTextCipher sensitiveTextCipher;

    private MiniappMessageServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MiniappMessageServiceImpl(
                whisperDao, conversationDao, memberDao, recordDao, appUserDao,
                imAccountDao, assistantMessageDao, systemMessageDao, auditContentService,
                messageDomainService, notificationDomainService, announcementHydrationService,
                accessProjectionService,
                settingService, sensitiveTextCipher);
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("悄悄话列表只返回待处理状态和消息主表中的 TIM 映射，不返回正文")
    void whisperListShouldExposeTimMappingWithoutBody() {
        AppMessageWhisper whisper = pendingWhisper();
        AppMessageRecord request = requestMessage();
        when(whisperDao.selectPending(eq(2L), eq("received"), eq(null), eq(21), any()))
                .thenReturn(List.of(whisper));
        when(recordDao.selectByIds(List.of(31L))).thenReturn(List.of(request));
        when(appUserDao.selectByIds(List.of(1L))).thenReturn(List.of(user(1L, "小星")));
        when(imAccountDao.selectByUserIds(List.of(1L))).thenReturn(List.of(imAccount(1L, "tu_peer_1")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of(1L, "avatar-1"));

        MessageWhisperPageVO result = service.whispers(2L, "received", null, 20);

        assertThat(result.getList()).hasSize(1);
        assertThat(result.getList().getFirst().getRequestTimMessageId()).isEqualTo("TIM-ID-1");
        assertThat(result.getList().getFirst().getRequestTimMsgKey()).isEqualTo("TIM-KEY-1");
        assertThat(result.getList().getFirst().getTimConversationId()).isEqualTo("C2C_tu_peer_1");
        assertThat(result.getList().getFirst().getCanReply()).isTrue();
    }

    @Test
    @DisplayName("悄悄话详情从申请和回复消息外键组装 TIM 映射，不返回正文")
    void whisperDetailShouldResolveBothTimMappingsFromMessageRecords() {
        AppMessageWhisper replied = pendingWhisper();
        replied.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        replied.setActiveMarker(null);
        replied.setConversationNo("CV-1");
        replied.setReplyMessageId(32L);
        AppMessageRecord request = requestMessage();
        AppMessageRecord reply = replyMessage();
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(replied);
        when(recordDao.selectByIds(List.of(31L, 32L))).thenReturn(List.of(request, reply));
        when(appUserDao.selectById(1L)).thenReturn(user(1L, "小星"));
        when(imAccountDao.selectByUserId(1L)).thenReturn(imAccount(1L, "tu_peer_1"));
        when(auditContentService.publicAvatar(1L)).thenReturn("avatar-1");

        MessageWhisperDetailVO result = service.whisperDetail(2L, "WSP-1");

        assertThat(result.getRequestTimMessageId()).isEqualTo("TIM-ID-1");
        assertThat(result.getReplyMessageNo()).isEqualTo("MSG-REPLY-1");
        assertThat(result.getReplyTimMessageId()).isEqualTo("TIM-ID-2");
        assertThat(result.getConversationNo()).isEqualTo("CV-1");
    }

    @Test
    @DisplayName("回复接口直接把原始正文交给领域编排，不做内容审核或本地加密")
    void replyShouldDelegatePlaintextToDomainOrchestrator() {
        WhisperReplyReq req = new WhisperReplyReq();
        req.setRequestId("reply-001");
        req.setContent("  我也想认识你  ");
        when(messageDomainService.replyWhisper(
                eq(2L), eq("WSP-1"), eq("reply-001"), eq("我也想认识你"), any()))
                .thenReturn(new WhisperReplyResult(
                        "WSP-1", "replied", "MAT-1", "CV-1", "MSG-REPLY-1",
                        "TIM-ID-2", "TIM-KEY-2", now));

        WhisperReplyVO result = service.replyWhisper(2L, "WSP-1", req);

        assertThat(result.getConversationNo()).isEqualTo("CV-1");
        assertThat(result.getReplyTimMessageId()).isEqualTo("TIM-ID-2");
        assertThat(result.getReplyTimMsgKey()).isEqualTo("TIM-KEY-2");
        verify(messageDomainService).replyWhisper(
                eq(2L), eq("WSP-1"), eq("reply-001"), eq("我也想认识你"), any());
    }

    @Test
    @DisplayName("会话列表仅返回业务白名单与 TIM 映射，不返回本地未读和最后正文")
    void conversationListShouldReturnBusinessMappingOnly() {
        AppMessageConversation conversation = conversation();
        AppMessageConversationMember member = member();
        when(conversationDao.selectActiveByUser(1L, null, null, 21))
                .thenReturn(List.of(conversation));
        when(memberDao.selectByUserAndConversations(1L, List.of(30L)))
                .thenReturn(List.of(member));
        when(appUserDao.selectByIds(List.of(2L))).thenReturn(List.of(user(2L, "小月")));
        when(imAccountDao.selectByUserIds(List.of(2L))).thenReturn(List.of(imAccount(2L, "tu_peer_2")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of(2L, "avatar-2"));

        MessageConversationPageVO result = service.conversations(1L, null, 20);

        assertThat(result.getList()).hasSize(1);
        assertThat(result.getList().getFirst().getTimConversationId()).isEqualTo("C2C_tu_peer_2");
        assertThat(result.getList().getFirst().getCanSend()).isTrue();
        assertThat(result.getList().getFirst().getLastBusinessActivityTime())
                .isEqualTo(conversation.getLastMessageTime());
        verify(recordDao, never()).selectHistory(any(), any(), any(Integer.class));
    }

    @Test
    @DisplayName("会话详情不查询聊天历史，普通消息历史和已读由 LiteChat SDK 承接")
    void conversationDetailShouldNotReadPlatformMessageHistory() {
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount(2L, "tu_peer_2"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getTimConversationId()).isEqualTo("C2C_tu_peer_2");
        assertThat(result.getCanSend()).isTrue();
        assertThat(result.getFemaleProtection().getEnabled()).isFalse();
        verify(recordDao, never()).selectHistory(any(), any(), any(Integer.class));
    }

    @Test
    @DisplayName("女性保护期内男方只能进入会话但不能先发送普通私信")
    void femaleProtectionShouldDisableMaleSend() {
        AppMessageConversation conversation = conversation();
        conversation.setProtectionEnabled(1);
        conversation.setFemaleUserId(2L);
        conversation.setMaleUserId(1L);
        conversation.setProtectionUntil(LocalDateTime.now().plusDays(1));
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount(2L, "tu_peer_2"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getCanSend()).isFalse();
        assertThat(result.getSendBlockedReason()).isEqualTo("female_protection");
        assertThat(result.getFemaleProtection().getWaitingForFemaleFirstMessage()).isTrue();
    }

    @Test
    @DisplayName("私信已读确认只推进当前成员在该会话中的接收消息")
    void conversationReadShouldAdvanceOwnedConversation() {
        AppMessageConversation conversation = conversation();
        AppMessageRecord lastMessage = new AppMessageRecord();
        lastMessage.setId(41L);
        lastMessage.setMessageNo("MSG-41");
        lastMessage.setConversationId(30L);
        MessageReadReq req = new MessageReadReq();
        req.setLastMessageNo("MSG-41");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(recordDao.selectByMessageNo("MSG-41")).thenReturn(lastMessage);
        when(recordDao.countUnreadByConversation(30L, 1L)).thenReturn(2L);

        MessageReadVO result = service.readConversation(1L, "CV-1", req);

        assertThat(result.getLastReadMessageNo()).isEqualTo("MSG-41");
        assertThat(result.getUnreadCount()).isEqualTo(2);
        verify(recordDao).markReadThrough(eq(30L), eq(1L), eq(41L), any());
    }

    @Test
    @DisplayName("消息首页汇总四类消息未读并只返回最近三条有效会话")
    void homeShouldReturnPlatformSummaryAndThreeRecentConversations() {
        AppUser current = user(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(whisperDao.countUnreadPending(eq(1L), any())).thenReturn(2L);
        when(recordDao.countUnreadByReceiver(1L)).thenReturn(5L);
        when(assistantMessageDao.countUnreadVisible(eq(1L), any())).thenReturn(3L);
        when(systemMessageDao.countUnreadVisible(eq(1L), any(), eq(false))).thenReturn(4L);
        when(conversationDao.selectActiveByUser(1L, null, null, 4))
                .thenReturn(List.of(conversation(30L, "CV-1", 2L),
                        conversation(31L, "CV-2", 3L),
                        conversation(32L, "CV-3", 4L),
                        conversation(33L, "CV-4", 5L)));
        when(memberDao.selectByUserAndConversations(1L, List.of(30L, 31L, 32L)))
                .thenReturn(List.of(member(30L, "CV-1", 2L), member(31L, "CV-2", 3L),
                        member(32L, "CV-3", 4L)));
        when(appUserDao.selectByIds(List.of(2L, 3L, 4L)))
                .thenReturn(List.of(user(2L, "用户2"), user(3L, "用户3"), user(4L, "用户4")));
        when(imAccountDao.selectByUserIds(List.of(2L, 3L, 4L)))
                .thenReturn(List.of(imAccount(2L, "tu_2"), imAccount(3L, "tu_3"),
                        imAccount(4L, "tu_4")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of());

        MessageHomeVO result = service.home(1L);

        assertThat(result.getAccessMode()).isEqualTo("normal");
        assertThat(result.getPlatformUnreadSummary().getPlatformUnreadCount()).isEqualTo(9L);
        assertThat(result.getPlatformUnreadSummary().getPrivateUnreadCount()).isEqualTo(5L);
        assertThat(result.getPlatformUnreadSummary().getMessageUnreadCount()).isEqualTo(14L);
        assertThat(result.getRecentConversationBindings()).hasSize(3);
        assertThat(result.getHasMoreConversations()).isTrue();
        assertThat(result.getFixedEntries()).extracting("entryType")
                .containsExactly("official_assistant", "system_message", "whisper");
    }

    @Test
    @DisplayName("受限账号只统计安全系统消息且不返回真人会话")
    void restrictedHomeShouldOnlyExposeSafetySystemMessages() {
        AppUser current = user(1L, "受限用户");
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("ABNORMAL");
        when(systemMessageDao.countUnreadVisible(eq(1L), any(), eq(true))).thenReturn(2L);

        MessageHomeVO result = service.home(1L);

        assertThat(result.getAccessMode()).isEqualTo("restricted");
        assertThat(result.getPlatformUnreadSummary().getWhisperUnreadCount()).isZero();
        assertThat(result.getPlatformUnreadSummary().getPrivateUnreadCount()).isZero();
        assertThat(result.getPlatformUnreadSummary().getAssistantUnreadCount()).isZero();
        assertThat(result.getPlatformUnreadSummary().getSystemUnreadCount()).isEqualTo(2L);
        assertThat(result.getRecentConversationBindings()).isEmpty();
        assertThat(result.getFixedEntries()).extracting("entryType")
                .containsExactly("system_message");
        verify(conversationDao, never()).selectActiveByUser(any(), any(), any(), any(Integer.class));
    }

    @Test
    @DisplayName("悄悄话批次已读只接受属于当前接收方且仍可见的记录")
    void whisperReadBatchShouldOnlyMarkOwnedVisibleRecords() {
        AppUser current = user(2L, "接收方");
        WhisperReadBatchReq req = new WhisperReadBatchReq();
        req.setWhisperNos(List.of("WSP-1", "WSP-OTHER", "WSP-1"));
        when(appUserDao.selectById(2L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(whisperDao.selectReadableNos(eq(2L), eq(List.of("WSP-1", "WSP-OTHER")), any()))
                .thenReturn(List.of("WSP-1"));
        when(whisperDao.markReadBatch(eq(2L), eq(List.of("WSP-1")), any())).thenReturn(1);
        when(whisperDao.countUnreadPending(eq(2L), any())).thenReturn(0L);
        when(assistantMessageDao.countUnreadVisible(eq(2L), any())).thenReturn(0L);
        when(systemMessageDao.countUnreadVisible(eq(2L), any(), eq(false))).thenReturn(0L);

        MessageReadBatchVO result = service.readWhispers(2L, req);

        assertThat(result.getAcceptedNos()).containsExactly("WSP-1");
        assertThat(result.getUpdatedCount()).isEqualTo(1);
        assertThat(result.getPlatformUnreadSummary().getPlatformUnreadCount()).isZero();
        verify(recordDao).markWhisperRequestsRead(eq(2L), eq(List.of("WSP-1")), any());
    }

    @Test
    @DisplayName("官方助手和系统消息列表解密标题正文并返回曝光确认候选")
    void channelListsShouldDecryptContentAndExposeReadCandidates() {
        AppUser current = user(1L, "当前用户");
        AppAssistantMessage assistant = assistantMessage();
        AppSystemMessage system = systemMessage();
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(assistantMessageDao.selectVisible(eq(1L), eq(null), eq(21), any()))
                .thenReturn(List.of(assistant));
        when(systemMessageDao.selectVisible(eq(1L), eq(null), eq(21), any(), eq(false)))
                .thenReturn(List.of(system));
        when(sensitiveTextCipher.decrypt(any())).thenReturn("已解密内容");

        AssistantMessagePageVO assistantResult = service.assistantMessages(1L, null, 20);
        SystemMessagePageVO systemResult = service.systemMessages(1L, null, 20);

        assertThat(assistantResult.getList().getFirst().getTitle()).isEqualTo("已解密内容");
        assertThat(assistantResult.getList().getFirst().getContent()).isEqualTo("已解密内容");
        assertThat(systemResult.getList().getFirst().getTitle()).isEqualTo("已解密内容");
        assertThat(systemResult.getReadAck().getNoticeNos()).containsExactly("NTF-1");
        verify(announcementHydrationService).hydrate(eq(1L), any());
        verify(notificationDomainService).ensureAssistantMessages(eq(1L), any());
    }

    @Test
    @DisplayName("会话拉黑复用统一黑名单流程并返回稳定拉黑业务号")
    void blockConversationShouldReuseSettingLifecycle() {
        ConversationBlockReq req = new ConversationBlockReq();
        req.setSourceScene("chat_menu");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation());
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(settingService.addBlock(eq(1L), eq("BLACKLIST"), any())).thenReturn(88L);

        ConversationBlockVO result = service.blockConversation(1L, "CV-1", req);

        assertThat(result.getConversationStatus()).isEqualTo("blocked");
        assertThat(result.getBlockNo()).isEqualTo("BLK-88");
        assertThat(result.getCanSend()).isFalse();
    }

    private AppMessageWhisper pendingWhisper() {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(10L);
        whisper.setWhisperNo("WSP-1");
        whisper.setSenderUserId(1L);
        whisper.setReceiverUserId(2L);
        whisper.setStatus(MessageWhisperStatusEnum.PENDING.getCode());
        whisper.setDeliveryStatus(MessageDeliveryStatusEnum.SENT.getCode());
        whisper.setExpiresAt(now.plusYears(1));
        whisper.setRequestMessageId(31L);
        whisper.setCreateTime(now.minusHours(1));
        return whisper;
    }

    private AppMessageRecord requestMessage() {
        AppMessageRecord message = new AppMessageRecord();
        message.setId(31L);
        message.setMessageNo("MSG-REQUEST-1");
        message.setTimMessageId("TIM-ID-1");
        message.setTimMsgKey("TIM-KEY-1");
        message.setSendStatus(MessageSendStatusEnum.SENT.getCode());
        return message;
    }

    private AppMessageRecord replyMessage() {
        AppMessageRecord message = new AppMessageRecord();
        message.setId(32L);
        message.setMessageNo("MSG-REPLY-1");
        message.setTimMessageId("TIM-ID-2");
        message.setTimMsgKey("TIM-KEY-2");
        message.setSendStatus(MessageSendStatusEnum.SENT.getCode());
        return message;
    }

    private AppMessageConversation conversation() {
        AppMessageConversation conversation = new AppMessageConversation();
        conversation.setId(30L);
        conversation.setConversationNo("CV-1");
        conversation.setTimConversationId("C2C_PAIR_1_2");
        conversation.setUserLowId(1L);
        conversation.setUserHighId(2L);
        conversation.setStatus(MessageConversationStatusEnum.ACTIVE.getCode());
        conversation.setProtectionEnabled(0);
        conversation.setLastMessageTime(now.minusMinutes(1));
        return conversation;
    }

    private AppMessageConversation conversation(Long id, String no, Long peerId) {
        AppMessageConversation value = conversation();
        value.setId(id);
        value.setConversationNo(no);
        value.setUserLowId(1L);
        value.setUserHighId(peerId);
        value.setLastMessageTime(now.minusMinutes(id));
        return value;
    }

    private AppMessageConversationMember member() {
        AppMessageConversationMember member = new AppMessageConversationMember();
        member.setConversationId(30L);
        member.setConversationNo("CV-1");
        member.setUserId(1L);
        member.setPeerUserId(2L);
        return member;
    }

    private AppMessageConversationMember member(Long conversationId, String no, Long peerId) {
        AppMessageConversationMember value = member();
        value.setConversationId(conversationId);
        value.setConversationNo(no);
        value.setPeerUserId(peerId);
        return value;
    }

    private AppAssistantMessage assistantMessage() {
        AppAssistantMessage message = new AppAssistantMessage();
        message.setId(41L);
        message.setAssistantMessageNo("AST-1");
        message.setTopicCode("private_chat_safety");
        message.setTitleCiphertext(new byte[]{1});
        message.setTitleIv(new byte[12]);
        message.setTitleKeyVersion("v1");
        message.setTitleHmac("a".repeat(64));
        message.setContentCiphertext(new byte[]{2});
        message.setContentIv(new byte[12]);
        message.setContentKeyVersion("v1");
        message.setContentHmac("b".repeat(64));
        message.setActionType("help");
        message.setActionValue("chat-safety");
        message.setCreateTime(now);
        return message;
    }

    private AppSystemMessage systemMessage() {
        AppSystemMessage message = new AppSystemMessage();
        message.setId(42L);
        message.setNoticeNo("NTF-1");
        message.setNotificationType("governance");
        message.setBizType("report_result");
        message.setTitleCiphertext(new byte[]{1});
        message.setTitleIv(new byte[12]);
        message.setTitleKeyVersion("v1");
        message.setTitleHmac("a".repeat(64));
        message.setContentCiphertext(new byte[]{2});
        message.setContentIv(new byte[12]);
        message.setContentKeyVersion("v1");
        message.setContentHmac("b".repeat(64));
        message.setJumpType("none");
        message.setCreateTime(now);
        return message;
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus("NORMAL");
        return user;
    }

    private AppUserImAccount imAccount(Long userId, String imUserId) {
        AppUserImAccount account = new AppUserImAccount();
        account.setUserId(userId);
        account.setImUserId(imUserId);
        account.setSyncStatus("synced");
        return account;
    }
}
