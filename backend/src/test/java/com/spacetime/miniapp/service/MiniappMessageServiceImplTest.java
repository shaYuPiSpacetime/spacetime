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
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.WhisperReplyResult;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MessageDomainService;
import com.spacetime.common.service.MessageAnnouncementHydrationService;
import com.spacetime.common.service.MessageNotificationDomainService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.AssistantMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.ConversationBlockReq;
import com.spacetime.miniapp.dto.request.MessageReadReq;
import com.spacetime.miniapp.dto.request.SystemMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReplyReq;
import com.spacetime.miniapp.dto.request.WhisperHideAllReq;
import com.spacetime.miniapp.dto.response.MessageConversationDetailVO;
import com.spacetime.miniapp.dto.response.MessageConversationPageVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.AssistantMessagePageVO;
import com.spacetime.miniapp.dto.response.ConversationBlockVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.LikesMeSummaryVO;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

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
    @Mock private MiniappRelationService relationService;
    @Mock private InstantMessageAccountProvider accountProvider;

    private MiniappMessageServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MiniappMessageServiceImpl(
                whisperDao, conversationDao, memberDao, recordDao, appUserDao,
                imAccountDao, assistantMessageDao, systemMessageDao, auditContentService,
                messageDomainService, notificationDomainService, announcementHydrationService,
                accessProjectionService,
                settingService, relationService, accountProvider);
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("悄悄话列表只返回业务投影，不依赖 TIM 账号和消息映射")
    void whisperListShouldExposeBusinessProjectionWithoutTimDependency() {
        AppMessageWhisper whisper = pendingWhisper();
        when(whisperDao.selectVisible(eq(2L), eq("received"), eq("pending"),
                eq(null), eq(21), any()))
                .thenReturn(List.of(whisper));
        when(whisperDao.countVisible(eq(2L), eq("received"), eq("pending"), any()))
                .thenReturn(1L);
        when(appUserDao.selectByIds(List.of(1L))).thenReturn(List.of(user(1L, "小星")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of(1L, "avatar-1"));

        MessageWhisperPageVO result = service.whispers(2L, "received", null, 20);

        assertThat(result.getList()).hasSize(1);
        assertThat(result.getBucket()).isEqualTo("pending");
        assertThat(result.getTotalCount()).isEqualTo(1L);
        assertThat(result.getList().getFirst().getCanReply()).isTrue();
        verifyNoInteractions(imAccountDao);
    }

    @Test
    @DisplayName("申请我的已处理区返回终态并使用独立分组游标")
    void receivedProcessedShouldUseIndependentBucket() {
        AppMessageWhisper replied = pendingWhisper();
        replied.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        replied.setRepliedAt(now.minusMinutes(5));
        when(whisperDao.selectVisible(eq(2L), eq("received"), eq("processed"),
                eq(null), eq(21), any())).thenReturn(List.of(replied));
        when(whisperDao.countVisible(eq(2L), eq("received"), eq("processed"), any()))
                .thenReturn(1L);
        when(appUserDao.selectByIds(List.of(1L))).thenReturn(List.of(user(1L, "小星")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of(1L, "avatar-1"));

        MessageWhisperPageVO result = service.whispers(
                2L, "received", "processed", null, 20);

        assertThat(result.getBucket()).isEqualTo("processed");
        assertThat(result.getList().getFirst().getStatus()).isEqualTo("replied");
        assertThat(result.getList().getFirst().getDisplayStatus()).isEqualTo("已回复并匹配");
    }

    @Test
    @DisplayName("接收方删除只写可见性事实，不修改悄悄话业务状态")
    void receiverHideShouldOnlyChangeVisibilityProjection() {
        AppMessageWhisper whisper = pendingWhisper();
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(whisper);
        when(whisperDao.hideByReceiver(eq(2L), eq("WSP-1"), eq("single"), any()))
                .thenReturn(1);

        var result = service.hideWhisper(2L, "WSP-1");

        assertThat(result.getHiddenCount()).isEqualTo(1);
        assertThat(result.getBucket()).isEqualTo("pending");
        assertThat(whisper.getStatus()).isEqualTo("pending");
        verify(whisperDao, never()).updateById(any());
    }

    @Test
    @DisplayName("申请我的支持按当前分组全部逻辑隐藏")
    void receiverCanHideCurrentBucket() {
        WhisperHideAllReq req = new WhisperHideAllReq();
        req.setBucket("processed");
        when(whisperDao.hideBucketByReceiver(eq(2L), eq("processed"), eq("bucket"), any()))
                .thenReturn(6);

        var result = service.hideReceivedWhispers(2L, req);

        assertThat(result.getBucket()).isEqualTo("processed");
        assertThat(result.getHiddenCount()).isEqualTo(6);
    }

    @Test
    @DisplayName("悄悄话详情从消息主表返回正文和业务动作，不暴露 TIM 原始编号")
    void whisperDetailShouldExposeBodyAndBusinessActions() {
        AppMessageWhisper replied = pendingWhisper();
        replied.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        replied.setActiveMarker(null);
        replied.setConversationNo("CV-1");
        replied.setReplyMessageId(32L);
        AppMessageRecord request = requestMessage();
        AppMessageRecord reply = replyMessage();
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(replied);
        when(recordDao.selectById(31L)).thenReturn(request);
        when(appUserDao.selectById(1L)).thenReturn(user(1L, "小星"));
        when(auditContentService.publicAvatar(1L)).thenReturn("avatar-1");

        MessageWhisperDetailVO result = service.whisperDetail(2L, "WSP-1");

        assertThat(result.getContent()).isEqualTo(request.getContentText());
        assertThat(result.getContentAvailable()).isTrue();
        assertThat(result.getRequestMessageNo()).isEqualTo("MSG-REQUEST-1");
        assertThat(result.getActions().getCanEnterConversation()).isTrue();
        assertThat(result.getConversationNo()).isEqualTo("CV-1");
    }

    @Test
    @DisplayName("回复接口直接把原始正文交给领域编排，不做内容审核或本地加密")
    void replyShouldDelegatePlaintextToDomainOrchestrator() {
        when(whisperDao.selectByWhisperNo("WSP-1")).thenReturn(pendingWhisper());
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
        assertThat(result.getReplyMessageNo()).isEqualTo("MSG-REPLY-1");
        verify(messageDomainService).replyWhisper(
                eq(2L), eq("WSP-1"), eq("reply-001"), eq("我也想认识你"), any());
    }

    @Test
    @DisplayName("会话列表返回最新消息摘要发送状态和当前用户未读数")
    void conversationListShouldReturnLatestMessageProjection() {
        AppMessageConversation conversation = conversation();
        conversation.setLastMessageId(41L);
        AppMessageConversationMember member = member();
        AppMessageRecord latest = new AppMessageRecord();
        latest.setId(41L);
        latest.setMessageNo("MSG-41");
        latest.setConversationId(30L);
        latest.setSenderUserId(1L);
        latest.setReceiverUserId(2L);
        latest.setMessageType("text");
        latest.setContentText("周末有空一起吃饭吗？");
        latest.setSendStatus("sent");
        latest.setSentAt(now.minusMinutes(1));
        when(conversationDao.selectActiveByUser(1L, null, null, 21))
                .thenReturn(List.of(conversation));
        when(memberDao.selectByUserAndConversations(1L, List.of(30L)))
                .thenReturn(List.of(member));
        when(recordDao.selectByIds(List.of(41L))).thenReturn(List.of(latest));
        when(recordDao.countUnreadByConversation(30L, 1L)).thenReturn(2L);
        when(appUserDao.selectByIds(List.of(2L))).thenReturn(List.of(user(2L, "小月")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of(2L, "avatar-2"));

        MessageConversationPageVO result = service.conversations(1L, null, 20);

        assertThat(result.getList()).hasSize(1);
        assertThat(result.getList().getFirst())
                .extracting("unreadCount", "lastMessage.messageNo", "lastMessage.direction",
                        "lastMessage.preview", "lastMessage.sendStatus")
                .containsExactly(2L, "MSG-41", "outgoing", "周末有空一起吃饭吗？", "sent");
        verify(imAccountDao, never()).selectByUserIds(any());
        verify(recordDao, never()).selectHistory(any(), any(), any(Integer.class));
    }

    @Test
    @DisplayName("会话详情不查询聊天历史，普通消息历史和已读由腾讯云 TIM SDK 承接")
    void conversationDetailShouldNotReadPlatformMessageHistory() {
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(recordDao.existsReportableIncomingText(30L, 1L)).thenReturn(true);
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount(2L, "tu_peer_2"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getTimConversationId()).isEqualTo("C2Ctu_peer_2");
        assertThat(result.getAccessMode()).isEqualTo("normal");
        assertThat(result.getCanSend()).isTrue();
        assertThat(result.getCanReportChat()).isTrue();
        assertThat(result.getReportContext())
                .extracting("sourceType", "conversationNo", "timConversationId")
                .containsExactly("private_chat", "CV-1", "C2Ctu_peer_2");
        assertThat(result.getSafetyActions())
                .containsExactly("report_chat", "block", "block_and_report");
        assertThat(result.getFemaleProtection().getEnabled()).isFalse();
        verify(accountProvider).syncAccount(2L, "小月", "avatar-2");
        verify(recordDao, never()).selectHistory(any(), any(), any(Integer.class));
    }

    @Test
    @DisplayName("有效会话缺少对方TIM映射时自动创建并同步账号")
    void conversationDetailShouldProvisionMissingPeerImAccount() {
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount(2L, "tu_peer_2"));

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getTimConversationId()).isEqualTo("C2Ctu_peer_2");
        assertThat(result.getCanEnterConversation()).isTrue();
        assertThat(result.getCanSend()).isTrue();
        verify(accountProvider).syncAccount(2L, "小月", "avatar-2");
    }

    @Test
    @DisplayName("有效会话的对方TIM映射待同步时自动完成同步")
    void conversationDetailShouldSyncPendingPeerImAccount() {
        AppMessageConversation conversation = conversation();
        AppUserImAccount synced = imAccount(2L, "tu_peer_2");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");
        when(imAccountDao.selectByUserId(2L)).thenReturn(synced);

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getTimConversationId()).isEqualTo("C2Ctu_peer_2");
        verify(accountProvider).syncAccount(2L, "小月", "avatar-2");
    }

    @Test
    @DisplayName("对方TIM账号同步失败时保持30023且不返回虚假会话状态")
    void conversationDetailShouldReturn30023WhenPeerImSyncFails() {
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");
        doThrow(new InstantMessageException("TIM_70002", "签名无效", false))
                .when(accountProvider).syncAccount(2L, "小月", "avatar-2");

        assertThatThrownBy(() -> service.conversationDetail(1L, "CV-1"))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo(30023);
                    assertThat(ex.getMessage()).isEqualTo("对方即时通信账号暂不可用");
                });
    }

    @Test
    @DisplayName("失效会话仅以安全只读模式开放历史和举报定位")
    void invalidConversationShouldReturnSafetyReadonlyContract() {
        AppMessageConversation conversation = conversation();
        conversation.setStatus(MessageConversationStatusEnum.INVALID.getCode());
        conversation.setInvalidReason("account_invalid");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(recordDao.existsReportableIncomingText(30L, 1L)).thenReturn(true);

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getAccessMode()).isEqualTo("safety_readonly");
        assertThat(result.getCanEnterConversation()).isFalse();
        assertThat(result.getCanSend()).isFalse();
        assertThat(result.getSendBlockedReason()).isEqualTo("conversation_invalid");
        assertThat(result.getCanReportChat()).isTrue();
        assertThat(result.getSafetyActions()).containsExactly("report_chat");
        assertThat(result.getPeerUser().getProfileAvailable()).isFalse();
        assertThat(result.getPeerUser().getNickname()).isEqualTo("用户已不可互动");
        assertThat(result.getPeerUser().getAvatarUrl()).isNull();
        assertThat(result.getTimConversationId()).isNull();
        assertThat(result.getReportContext().getTimConversationId()).isNull();
        verifyNoInteractions(appUserDao, auditContentService);
        verify(imAccountDao).selectByUserId(2L);
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
        assertThat(result.getFemaleProtection().getProtectionUntil())
                .isEqualTo(conversation.getProtectionUntil());
    }

    @Test
    @DisplayName("女性保护已开启但截止时间缺失时按保守策略禁止男方先发消息")
    void femaleProtectionWithoutDeadlineShouldStillDisableMaleSend() {
        AppMessageConversation conversation = conversation();
        conversation.setProtectionEnabled(1);
        conversation.setFemaleUserId(2L);
        conversation.setMaleUserId(1L);
        conversation.setProtectionUntil(null);
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(appUserDao.selectById(2L)).thenReturn(user(2L, "小月"));
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount(2L, "tu_peer_2"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2");

        MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");

        assertThat(result.getCanSend()).isFalse();
        assertThat(result.getSendBlockedReason()).isEqualTo("female_protection");
        assertThat(result.getFemaleProtection().getWaitingForFemaleFirstMessage()).isTrue();
        assertThat(result.getFemaleProtection().getProtectionUntil()).isNull();
    }

    @Test
    @DisplayName("私信已读确认只推进当前成员在该会话中的接收消息")
    void conversationReadShouldAdvanceOwnedConversation() {
        AppMessageConversation conversation = conversation();
        AppMessageRecord lastMessage = new AppMessageRecord();
        lastMessage.setId(41L);
        lastMessage.setMessageNo("MSG-41");
        lastMessage.setConversationId(30L);
        lastMessage.setSentAt(now);
        MessageReadReq req = new MessageReadReq();
        req.setLastMessageNo("MSG-41");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(recordDao.selectByMessageNo("MSG-41")).thenReturn(lastMessage);
        when(recordDao.countUnreadByConversation(30L, 1L)).thenReturn(2L);

        MessageReadVO result = service.readConversation(1L, "CV-1", req);

        assertThat(result.getLastReadMessageNo()).isEqualTo("MSG-41");
        assertThat(result.getUnreadCount()).isEqualTo(2);
        var ordered = inOrder(memberDao, recordDao);
        ordered.verify(memberDao).advanceReadWatermark(eq(30L), eq(1L), eq(now), any());
        ordered.verify(recordDao).markReadThrough(eq(30L), eq(1L), eq(41L), any());
    }

    @Test
    @DisplayName("私信已读确认可使用TIM消息标识定位平台归档消息")
    void conversationReadShouldResolveTimMessageLocator() {
        AppMessageConversation conversation = conversation();
        AppMessageRecord lastMessage = new AppMessageRecord();
        lastMessage.setId(42L);
        lastMessage.setMessageNo("MSG-42");
        lastMessage.setConversationId(30L);
        lastMessage.setTimMessageId("TIM-42");
        lastMessage.setTimMsgKey("KEY-42");
        lastMessage.setSentAt(now);
        MessageReadReq req = new MessageReadReq();
        req.setTimMessageId("TIM-42");
        req.setTimMsgKey("KEY-42");
        when(conversationDao.selectByConversationNo("CV-1")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(30L, 1L)).thenReturn(member());
        when(recordDao.selectByConversationAndTimLocator(30L, "TIM-42", "KEY-42"))
                .thenReturn(lastMessage);
        when(recordDao.countUnreadByConversation(30L, 1L)).thenReturn(0L);

        MessageReadVO result = service.readConversation(1L, "CV-1", req);

        assertThat(result.getLastReadMessageNo()).isEqualTo("MSG-42");
        verify(recordDao).markReadThrough(30L, 1L, 42L, result.getReadAt());
    }

    @Test
    @DisplayName("消息首页提供游标分页并返回五类摘要和首屏私信会话")
    void homeShouldReturnSummariesAndConversationPage() {
        assertThat(List.of(MiniappMessageService.class.getMethods()))
                .anyMatch(method -> method.getName().equals("home")
                        && method.getParameterCount() == 3);
        AppUser current = user(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(whisperDao.countUnreadPending(eq(1L), any())).thenReturn(2L);
        when(recordDao.countUnreadByReceiver(1L)).thenReturn(5L);
        when(assistantMessageDao.countUnreadVisible(eq(1L), any())).thenReturn(3L);
        when(systemMessageDao.countUnreadVisible(eq(1L), any(), eq(false))).thenReturn(4L);
        when(conversationDao.selectActiveByUser(1L, null, null, 21))
                .thenReturn(List.of(conversation(30L, "CV-1", 2L),
                        conversation(31L, "CV-2", 3L),
                        conversation(32L, "CV-3", 4L),
                        conversation(33L, "CV-4", 5L)));
        when(memberDao.selectByUserAndConversations(1L, List.of(30L, 31L, 32L, 33L)))
                .thenReturn(List.of(member(30L, "CV-1", 2L), member(31L, "CV-2", 3L),
                        member(32L, "CV-3", 4L), member(33L, "CV-4", 5L)));
        when(appUserDao.selectByIds(List.of(2L, 3L, 4L, 5L)))
                .thenReturn(List.of(user(2L, "用户2"), user(3L, "用户3"), user(4L, "用户4"),
                        user(5L, "用户5")));
        when(auditContentService.publicAvatars(any())).thenReturn(Map.of());
        when(whisperDao.selectPending(eq(1L), eq("received"), eq(null), eq(3), any()))
                .thenReturn(List.of());
        when(whisperDao.countPending(eq(1L), any())).thenReturn(7L);
        when(assistantMessageDao.selectVisible(eq(1L), eq(null), eq(1), any()))
                .thenReturn(List.of());
        when(systemMessageDao.selectVisible(eq(1L), eq(null), eq(1), any(), eq(false)))
                .thenReturn(List.of());
        when(relationService.likesMeSummary(1L)).thenReturn(new LikesMeSummaryVO());

        MessageHomeVO result = service.home(1L);

        assertThat(result.getAccessMode()).isEqualTo("normal");
        assertThat(result).extracting("unreadSummary.messageUnreadCount")
                .isEqualTo(14L);
        assertThat(result).extracting("whisperSummary", "likesMeSummary",
                        "assistantSummary", "systemSummary", "conversationPage")
                .doesNotContainNull();
        assertThat(result.getWhisperSummary().getPendingCount()).isEqualTo(7L);
        verify(imAccountDao, never()).selectByUserIds(any());
    }

    @Test
    @DisplayName("受限账号只统计安全系统消息且不返回真人会话")
    void restrictedHomeShouldOnlyExposeSafetySystemMessages() {
        AppUser current = user(1L, "受限用户");
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("ABNORMAL");
        when(systemMessageDao.countUnreadVisible(eq(1L), any(), eq(true))).thenReturn(2L);
        when(systemMessageDao.selectVisible(eq(1L), eq(null), eq(1), any(), eq(true)))
                .thenReturn(List.of());

        MessageHomeVO result = service.home(1L);

        assertThat(result.getAccessMode()).isEqualTo("restricted");
        assertThat(result.getUnreadSummary().getWhisperUnreadCount()).isZero();
        assertThat(result.getUnreadSummary().getPrivateUnreadCount()).isZero();
        assertThat(result.getUnreadSummary().getAssistantUnreadCount()).isZero();
        assertThat(result.getUnreadSummary().getSystemUnreadCount()).isEqualTo(2L);
        assertThat(result.getConversationPage().getList()).isEmpty();
        assertThat(result.getSystemSummary().getUnreadCount()).isEqualTo(2L);
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
        assertThat(result.getPlatformUnreadSummary().getMessageUnreadCount()).isZero();
        verify(recordDao).markWhisperRequestsRead(eq(2L), eq(List.of("WSP-1")), any());
    }

    @Test
    @DisplayName("官方助手和系统消息列表直接读取明文并返回曝光确认候选")
    void channelListsShouldReadPlaintextAndExposeReadCandidates() {
        AppUser current = user(1L, "当前用户");
        AppAssistantMessage assistant = assistantMessage();
        AppSystemMessage system = systemMessage();
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(assistantMessageDao.selectVisible(eq(1L), eq(null), eq(21), any()))
                .thenReturn(List.of(assistant));
        when(systemMessageDao.selectVisible(eq(1L), eq(null), eq(21), any(), eq(false)))
                .thenReturn(List.of(system));
        AssistantMessagePageVO assistantResult = service.assistantMessages(1L, null, 20);
        SystemMessagePageVO systemResult = service.systemMessages(1L, null, 20);

        assertThat(assistantResult.getList().getFirst().getTitle()).isEqualTo("助手标题");
        assertThat(assistantResult.getList().getFirst().getContent()).isEqualTo("助手正文");
        assertThat(assistantResult.getList().getFirst().getCardType()).isEqualTo("action");
        assertThat(assistantResult.getList().getFirst().getActionText()).isEqualTo("查看安全指南");
        assertThat(systemResult.getList().getFirst().getTitle()).isEqualTo("系统标题");
        assertThat(systemResult.getList().getFirst().getContent()).isEqualTo("系统正文");
        assertThat(systemResult.getList().getFirst().getContentFormat()).isEqualTo("rich_text");
        assertThat(systemResult.getList().getFirst().getActionText()).isEqualTo("立即查看");
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
        message.setContentText("你好，希望能和你认识一下");
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
        message.setTitleText("助手标题");
        message.setContentText("助手正文");
        message.setActionType("help");
        message.setActionValue("chat-safety");
        message.setCardType("action");
        message.setActionText("查看安全指南");
        message.setCreateTime(now);
        return message;
    }

    private AppSystemMessage systemMessage() {
        AppSystemMessage message = new AppSystemMessage();
        message.setId(42L);
        message.setNoticeNo("NTF-1");
        message.setNotificationType("governance");
        message.setBizType("report_result");
        message.setTitleText("系统标题");
        message.setContentText("系统正文");
        message.setJumpType("none");
        message.setContentFormat("rich_text");
        message.setActionText("立即查看");
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
