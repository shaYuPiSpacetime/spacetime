package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.service.impl.AppUserMessageAdminServiceImpl;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserMessageAdminQueryDao;
import com.spacetime.common.dao.CommunityReportDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.AppUserPrivateMessageProjection;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-03 App 用户消息互动后台查询")
class AppUserMessageAdminServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppSystemMessageDao systemMessageDao;
    @Mock private CommunityReportDao reportDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppUserMessageAdminQueryDao queryDao;
    @Mock private MessageSensitiveAccessAuditService auditService;

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("会话列表应识别对方并只返回脱敏标识")
    void shouldReturnMaskedConversationPeer() {
        AppUser user = new AppUser();
        user.setId(12L);
        when(appUserDao.selectById(12L)).thenReturn(user);
        AppMessageConversation conversation = new AppMessageConversation();
        conversation.setConversationNo("CV-001");
        conversation.setTimConversationId("C2C_peer");
        conversation.setUserLowId(12L);
        conversation.setUserHighId(34L);
        conversation.setStatus("active");
        conversation.setLastMessageTime(LocalDateTime.of(2026, 8, 10, 12, 0));
        Page<AppMessageConversation> data = new Page<>(1, 20, 1);
        data.setRecords(List.of(conversation));
        when(conversationDao.selectPage(any(), any())).thenReturn(data);

        var result = service().conversations(12L, new PageReq());

        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getConversationNo()).isEqualTo("CV-001");
            assertThat(item.getPeerMask()).endsWith("0034");
        });
    }

    @Test
    @DisplayName("私信列表应返回发送、已读和失败元数据但不包含正文")
    void shouldReturnPrivateMessageMetadata() {
        AppUser user = new AppUser();
        user.setId(12L);
        when(appUserDao.selectById(12L)).thenReturn(user);
        AppUserPrivateMessageProjection message = new AppUserPrivateMessageProjection();
        message.setMessageNo("MSG-001");
        message.setSenderUserId(34L);
        message.setReceiverUserId(12L);
        message.setSendStatus("sent");
        message.setReceiverReadStatus("unread");
        message.setContentAvailable(true);
        AppUser peer = new AppUser();
        peer.setId(34L);
        peer.setNickname("小刚");
        PageReq req = new PageReq();
        req.setSize(100);
        when(queryDao.selectPrivateMessages(12L, 0, 5)).thenReturn(List.of(message));
        when(queryDao.countPrivateMessages(12L)).thenReturn(1L);
        when(appUserDao.selectByIds(List.of(34L))).thenReturn(List.of(peer));

        var result = service().privateMessages(12L, req);

        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDirection()).isEqualTo("received");
            assertThat(item.getPeerMask()).endsWith("0034");
            assertThat(item.getPeerUserId()).isEqualTo(34L);
            assertThat(item.getPeerNickname()).isEqualTo("小刚");
            assertThat(item.getReceiverReadStatus()).isEqualTo("unread");
            assertThat(item.getContentAvailable()).isTrue();
        });
    }

    @Test
    @DisplayName("悄悄话列表应返回对方昵称和用户编号")
    void shouldReturnWhisperPeerIdentity() {
        AppUser user = new AppUser();
        user.setId(12L);
        when(appUserDao.selectById(12L)).thenReturn(user);
        AppUser peer = new AppUser();
        peer.setId(34L);
        peer.setNickname("小刚");
        when(appUserDao.selectByIds(List.of(34L))).thenReturn(List.of(peer));

        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setWhisperNo("WSP-001");
        whisper.setSenderUserId(12L);
        whisper.setReceiverUserId(34L);
        whisper.setStatus("pending");
        Page<AppMessageWhisper> page = new Page<>(1, 5, 1);
        page.setRecords(List.of(whisper));
        when(whisperDao.selectPage(any(), any())).thenReturn(page);
        when(recordDao.selectByIds(List.of())).thenReturn(List.of());

        var result = service().whispers(12L, new PageReq());

        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDirection()).isEqualTo("sent");
            assertThat(item.getPeerUserId()).isEqualTo(34L);
            assertThat(item.getPeerNickname()).isEqualTo("小刚");
        });
    }

    @Test
    @DisplayName("正文已清理的高敏查看也应先审计并记录拒绝结果")
    void shouldAuditDeniedSensitiveContentAccess() {
        UserContextHolder.set(new UserContext(9L, "审核员", List.of("auditor"),
                List.of("message:sensitive-content:view")));
        AppUser user = new AppUser();
        user.setId(12L);
        when(appUserDao.selectById(12L)).thenReturn(user);
        AppMessageRecord message = new AppMessageRecord();
        message.setMessageNo("MSG-CLEARED-001");
        message.setSenderUserId(34L);
        message.setReceiverUserId(12L);
        message.setContentClearedAt(LocalDateTime.of(2026, 8, 10, 12, 0));
        when(recordDao.selectByMessageNo("MSG-CLEARED-001")).thenReturn(message);
        when(auditService.begin(any())).thenReturn("ACC-DENIED-001");
        SensitiveContentViewReq req = new SensitiveContentViewReq();
        req.setViewReason("核查用户投诉中的历史消息");
        req.setRequestId("REQ-CLEARED-001");

        assertThatThrownBy(() -> service().viewPrivateMessageContent(
                12L, "MSG-CLEARED-001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("消息正文已清理或不可用");

        var ordered = inOrder(auditService, recordDao);
        ordered.verify(auditService).begin(any());
        ordered.verify(recordDao).selectByMessageNo("MSG-CLEARED-001");
        verify(auditService).complete("ACC-DENIED-001", "denied", "business_30022");
    }

    private AppUserMessageAdminServiceImpl service() {
        return new AppUserMessageAdminServiceImpl(appUserDao, conversationDao, whisperDao,
                systemMessageDao, reportDao, recordDao, queryDao, auditService);
    }
}
