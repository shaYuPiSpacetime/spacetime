package com.spacetime.common.community;

import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("聊天举报可信上下文解析")
class MessageChatReportContextResolverTest {
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageConversationMemberDao memberDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppUserImAccountDao imAccountDao;

    private MessageChatReportContextResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new MessageChatReportContextResolver(
                conversationDao, memberDao, recordDao, whisperDao, imAccountDao);
    }

    @Test
    @DisplayName("举报对方消息时校验参与关系和TIM映射并冻结前5后2窗口")
    void messageReportShouldResolveTrustedWindow() {
        AppMessageRecord target = message(20L, "MSG-20", 2L, 1L);
        target.setTimMessageId("TIM-20");
        target.setTimMsgKey("KEY-20");
        AppMessageConversation conversation = conversation();
        when(recordDao.selectByMessageNo("MSG-20")).thenReturn(target);
        when(conversationDao.selectById(10L)).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(10L, 1L)).thenReturn(member());
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount());
        when(recordDao.selectSentBefore(10L, 20L, 5))
                .thenReturn(List.of(message(19L, "MSG-19", 1L, 2L)));
        when(recordDao.selectSentAfter(10L, 20L, 2))
                .thenReturn(List.of(message(21L, "MSG-21", 1L, 2L)));

        TrustedChatReportContext result = resolver.resolve(1L, new ChatReportLookup(
                "message", null, null, "MSG-20", "MSG-20", "C2Ctu_peer_2",
                "TIM-20", "KEY-20"));

        assertThat(result.targetUserId()).isEqualTo(2L);
        assertThat(result.targetMessageId()).isEqualTo(20L);
        assertThat(result.evidenceMessageIds()).containsExactly(19L, 20L, 21L);
        assertThat(result.conversationNo()).isEqualTo("CV-10");
    }

    @Test
    @DisplayName("普通私信未携带平台消息号时可按 LiteChat 消息 ID 定位举报目标")
    void messageReportShouldResolveLiteChatMessageId() {
        AppMessageRecord target = message(20L, "MSG-20", 2L, 1L);
        target.setTimMessageId("TIM-20");
        AppMessageConversation conversation = conversation();
        when(recordDao.selectByMessageNo("TIM-20")).thenReturn(null);
        when(recordDao.selectByTimMessageId("TIM-20")).thenReturn(target);
        when(conversationDao.selectById(10L)).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(10L, 1L)).thenReturn(member());
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount());
        when(recordDao.selectSentBefore(10L, 20L, 5)).thenReturn(List.of());
        when(recordDao.selectSentAfter(10L, 20L, 2)).thenReturn(List.of());

        TrustedChatReportContext result = resolver.resolve(1L, new ChatReportLookup(
                "message", "CV-10", null, "TIM-20", "TIM-20", "C2Ctu_peer_2",
                "TIM-20", null));

        assertThat(result.targetNo()).isEqualTo("MSG-20");
        assertThat(result.targetMessageId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("用户不能把自己发送的消息作为被举报目标")
    void ownMessageShouldBeRejected() {
        when(recordDao.selectByMessageNo("MSG-20"))
                .thenReturn(message(20L, "MSG-20", 1L, 2L));

        assertThatThrownBy(() -> resolver.resolve(1L, new ChatReportLookup(
                "message", null, null, "MSG-20", "MSG-20", null, null, null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("会话顶部举报使用private_chat上下文并冻结最近消息")
    void privateChatReportShouldResolveConversationWindow() {
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-10")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(10L, 1L)).thenReturn(member());
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount());
        when(recordDao.selectHistory(10L, null, 20)).thenReturn(List.of(
                message(21L, "MSG-21", 2L, 1L),
                message(20L, "MSG-20", 1L, 2L)));

        TrustedChatReportContext result = resolver.resolve(1L, new ChatReportLookup(
                "private_chat", "CV-10", null, null, "CV-10",
                "C2Ctu_peer_2", null, null));

        assertThat(result.targetNo()).isEqualTo("CV-10");
        assertThat(result.targetUserId()).isEqualTo(2L);
        assertThat(result.sourceType()).isEqualTo("private_chat");
        assertThat(result.evidenceMessageIds()).containsExactly(20L, 21L);
    }

    @Test
    @DisplayName("私信明确选中对方消息时仍以会话为举报主目标")
    void privateChatSelectedMessageShouldKeepConversationAsReportTarget() {
        AppMessageRecord target = message(20L, "MSG-20", 2L, 1L);
        target.setTimMessageId("TIM-20");
        target.setTimMsgKey("KEY-20");
        AppMessageConversation conversation = conversation();
        when(recordDao.selectByMessageNo("MSG-20")).thenReturn(target);
        when(conversationDao.selectByConversationNo("CV-10")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(10L, 1L)).thenReturn(member());
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount());
        when(recordDao.selectSentBefore(10L, 20L, 5)).thenReturn(List.of());
        when(recordDao.selectSentAfter(10L, 20L, 2)).thenReturn(List.of());

        TrustedChatReportContext result = resolver.resolve(1L, new ChatReportLookup(
                "private_chat", "CV-10", null, "MSG-20", "CV-10",
                "C2Ctu_peer_2", "TIM-20", "KEY-20"));

        assertThat(result.targetNo()).isEqualTo("CV-10");
        assertThat(result.sourceType()).isEqualTo("private_chat");
        assertThat(result.targetMessageId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("私信可使用TIM消息标识选定被举报消息且主目标仍为会话")
    void privateChatShouldResolveSelectedMessageByTimLocator() {
        AppMessageRecord target = message(20L, "MSG-20", 2L, 1L);
        target.setTimMessageId("TIM-20");
        target.setTimMsgKey("KEY-20");
        AppMessageConversation conversation = conversation();
        when(conversationDao.selectByConversationNo("CV-10")).thenReturn(conversation);
        when(memberDao.selectByConversationAndUser(10L, 1L)).thenReturn(member());
        when(imAccountDao.selectByUserId(2L)).thenReturn(imAccount());
        when(recordDao.selectByConversationAndTimLocator(10L, "TIM-20", "KEY-20"))
                .thenReturn(target);
        when(recordDao.selectSentBefore(10L, 20L, 5)).thenReturn(List.of());
        when(recordDao.selectSentAfter(10L, 20L, 2)).thenReturn(List.of());

        TrustedChatReportContext result = resolver.resolve(1L, new ChatReportLookup(
                "private_chat", "CV-10", null, null, "CV-10",
                "C2Ctu_peer_2", "TIM-20", "KEY-20"));

        assertThat(result.targetNo()).isEqualTo("CV-10");
        assertThat(result.targetMessageId()).isEqualTo(20L);
        assertThat(result.evidenceMessageIds()).containsExactly(20L);
    }

    private AppMessageConversation conversation() {
        AppMessageConversation value = new AppMessageConversation();
        value.setId(10L);
        value.setConversationNo("CV-10");
        value.setUserLowId(1L);
        value.setUserHighId(2L);
        return value;
    }

    private AppMessageConversationMember member() {
        AppMessageConversationMember value = new AppMessageConversationMember();
        value.setConversationId(10L);
        value.setUserId(1L);
        value.setPeerUserId(2L);
        return value;
    }

    private AppMessageRecord message(Long id, String no, Long sender, Long receiver) {
        AppMessageRecord value = new AppMessageRecord();
        value.setId(id);
        value.setMessageNo(no);
        value.setConversationId(10L);
        value.setConversationNo("CV-10");
        value.setSenderUserId(sender);
        value.setReceiverUserId(receiver);
        value.setSendStatus("sent");
        return value;
    }

    private AppUserImAccount imAccount() {
        AppUserImAccount value = new AppUserImAccount();
        value.setUserId(2L);
        value.setImUserId("tu_peer_2");
        return value;
    }
}
