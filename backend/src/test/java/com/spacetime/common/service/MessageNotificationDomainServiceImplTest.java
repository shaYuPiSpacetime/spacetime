package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.dao.AppMessageTemplateVersionDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.entity.AppMessageTemplateVersion;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.model.message.SystemMessageEventPayload;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.impl.MessageNotificationDomainServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("系统消息模板渲染与加密落库")
class MessageNotificationDomainServiceImplTest {
    @Mock private AppMessageTemplateVersionDao templateDao;
    @Mock private AppSystemMessageDao systemMessageDao;
    @Mock private AppAssistantMessageDao assistantMessageDao;
    @Mock private SensitiveTextCipher cipher;

    private MessageNotificationDomainServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MessageNotificationDomainServiceImpl(
                templateDao, systemMessageDao, assistantMessageDao, cipher,
                new ObjectMapper(), "safe.example.com");
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("系统事件按模板变量渲染并分别加密标题正文")
    void systemEventShouldRenderAndEncryptMessage() {
        AppMessageTemplateVersion template = template();
        AppMessageEventInbox inbox = inbox();
        SystemMessageEventPayload payload = new SystemMessageEventPayload(
                "report_result", "report_result", Map.of("result", "已处理"), now.plusDays(30));
        when(templateDao.selectCurrent("report_result")).thenReturn(template);
        when(systemMessageDao.selectByEvent("RPT-1-v2", 8L, "report_result")).thenReturn(null);
        when(cipher.encrypt("举报处理结果")).thenReturn(encrypted((byte) 1, "title-hmac"));
        when(cipher.encrypt("你的举报已处理")).thenReturn(encrypted((byte) 2, "content-hmac"));

        service.createSystemMessage(inbox, payload, now);

        ArgumentCaptor<AppSystemMessage> captor = ArgumentCaptor.forClass(AppSystemMessage.class);
        verify(systemMessageDao).insert(captor.capture());
        AppSystemMessage stored = captor.getValue();
        assertThat(stored.getReceiverUserId()).isEqualTo(8L);
        assertThat(stored.getBizType()).isEqualTo("report_result");
        assertThat(stored.getTitleHmac()).isEqualTo("title-hmac");
        assertThat(stored.getContentHmac()).isEqualTo("content-hmac");
        assertThat(stored.getSafetyRequired()).isEqualTo(1);
        assertThat(stored.getVisibleUntil()).isEqualTo(now.plusDays(30));
    }

    @Test
    @DisplayName("重复上游事件不得重复生成系统消息")
    void duplicateEventShouldReuseExistingMessage() {
        AppSystemMessage existing = new AppSystemMessage();
        existing.setNoticeNo("NTF-EXISTING");
        when(systemMessageDao.selectByEvent("RPT-1-v2", 8L, "report_result"))
                .thenReturn(existing);

        String noticeNo = service.createSystemMessage(inbox(), new SystemMessageEventPayload(
                "report_result", "report_result", Map.of("result", "已处理"), now.plusDays(30)), now);

        assertThat(noticeNo).isEqualTo("NTF-EXISTING");
        verify(templateDao, never()).selectCurrent(any());
        verify(systemMessageDao, never()).insert(any());
    }

    @Test
    @DisplayName("首次打开官方助手时按已发布模板版本幂等生成低频消息")
    void assistantShouldBeLazilyCreatedFromPublishedTemplates() {
        AppMessageTemplateVersion template = template();
        template.setTemplateCode("assistant_chat_safety");
        template.setBizType("private_chat_safety");
        template.setNotificationType("assistant");
        template.setContentTemplate("请勿向陌生人转账");
        template.setAllowedVariablesJson("[]");
        template.setJumpType("help");
        template.setJumpValueTemplate("/pages/help/index");
        when(templateDao.selectCurrentByNotificationType("assistant")).thenReturn(List.of(template));
        when(assistantMessageDao.selectByUserTopicVersion(
                8L, "private_chat_safety", "v1")).thenReturn(null);
        when(cipher.encrypt("举报处理结果")).thenReturn(encrypted((byte) 1, "title-hmac"));
        when(cipher.encrypt("请勿向陌生人转账")).thenReturn(encrypted((byte) 2, "content-hmac"));

        service.ensureAssistantMessages(8L, now);

        ArgumentCaptor<AppAssistantMessage> captor = ArgumentCaptor.forClass(AppAssistantMessage.class);
        verify(assistantMessageDao).insert(captor.capture());
        assertThat(captor.getValue().getTopicCode()).isEqualTo("private_chat_safety");
        assertThat(captor.getValue().getContentVersion()).isEqualTo("v1");
        assertThat(captor.getValue().getTitleHmac()).isEqualTo("title-hmac");
        assertThat(captor.getValue().getActionType()).isEqualTo("help");
        assertThat(captor.getValue().getActionValue()).isEqualTo("/pages/help/index");
    }

    @Test
    @DisplayName("H5 域名白名单重复配置时不应导致服务初始化失败")
    void duplicateAllowedHostsShouldBeDeduplicated() {
        assertThatCode(() -> new MessageNotificationDomainServiceImpl(
                templateDao, systemMessageDao, assistantMessageDao, cipher,
                new ObjectMapper(), "SAFE.example.com, safe.example.com"))
                .doesNotThrowAnyException();
    }

    private AppMessageEventInbox inbox() {
        AppMessageEventInbox inbox = new AppMessageEventInbox();
        inbox.setSourceModule("prd05");
        inbox.setEventType("system_message_create");
        inbox.setProducerEventId("RPT-1-v2");
        inbox.setReceiverUserId(8L);
        inbox.setBizNo("RPT-1");
        return inbox;
    }

    private AppMessageTemplateVersion template() {
        AppMessageTemplateVersion template = new AppMessageTemplateVersion();
        template.setTemplateCode("report_result");
        template.setBizType("report_result");
        template.setNotificationType("governance");
        template.setVersionNo("v1");
        template.setStatus("published");
        template.setTitleTemplate("举报处理结果");
        template.setContentTemplate("你的举报{{result}}");
        template.setAllowedVariablesJson("{\"result\":{\"required\":true}}");
        template.setJumpType("none");
        template.setSafetyRequired(1);
        return template;
    }

    private EncryptedMessageContent encrypted(byte value, String hmac) {
        return new EncryptedMessageContent(new byte[]{value}, new byte[12], "v1", hmac);
    }
}
