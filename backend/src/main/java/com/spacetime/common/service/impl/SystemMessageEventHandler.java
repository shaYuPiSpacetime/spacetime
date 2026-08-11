package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.model.message.SystemMessageEventPayload;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.MessageEventHandler;
import com.spacetime.common.service.MessageNotificationDomainService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 解密系统消息临时载荷并交给领域服务幂等生成站内消息。 */
@Component
@RequiredArgsConstructor
public class SystemMessageEventHandler implements MessageEventHandler {
    private final SensitiveTextCipher cipher;
    private final ObjectMapper objectMapper;
    private final MessageNotificationDomainService notificationService;

    @Override
    public boolean supports(String sourceModule, String eventType) {
        return "system_message_create".equals(eventType);
    }

    @Override
    public void handle(AppMessageEventInbox inbox) {
        try {
            String payloadJson = cipher.decrypt(new EncryptedMessageContent(
                    inbox.getPayloadCiphertext(), inbox.getPayloadIv(),
                    inbox.getPayloadKeyVersion(), inbox.getPayloadHmac()));
            SystemMessageEventPayload payload = objectMapper.copy().findAndRegisterModules()
                    .readValue(payloadJson, SystemMessageEventPayload.class);
            notificationService.createSystemMessage(inbox, payload, LocalDateTime.now());
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(30018, "系统消息事件载荷解析失败");
        }
    }
}
