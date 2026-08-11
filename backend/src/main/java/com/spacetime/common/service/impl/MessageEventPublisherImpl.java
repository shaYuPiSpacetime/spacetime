package com.spacetime.common.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.model.message.SystemMessageEventPayload;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.MessageEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

/** 上游业务提交后以独立事务写入消息 Inbox。 */
@Service
@RequiredArgsConstructor
public class MessageEventPublisherImpl implements MessageEventPublisher {
    private static final Set<String> SOURCES = Set.of(
            "prd01", "prd02", "prd04", "prd05", "prd07", "community", "content");
    private static final Set<String> FORBIDDEN_PAYLOAD_KEYS = Set.of(
            "content", "message", "text", "body", "replyContent", "requestContent");

    private final AppMessageEventInboxDao inboxDao;
    private final SensitiveTextCipher cipher;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long publishSystemMessage(SystemMessageEvent event, LocalDateTime now) {
        requireEvent(event);
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        String eventKey = event.sourceModule() + ":system_message_create:"
                + event.producerEventId() + ":" + event.receiverUserId();
        AppMessageEventInbox existing = inboxDao.selectByEventKey(eventKey);
        if (existing != null) {
            return existing.getId();
        }
        SystemMessageEventPayload payload = new SystemMessageEventPayload(
                event.templateCode(), event.bizType(), safeVariables(event.variables()),
                event.visibleUntil());
        EncryptedMessageContent encrypted = cipher.encrypt(writePayload(payload));

        AppMessageEventInbox inbox = new AppMessageEventInbox();
        inbox.setEventKey(eventKey);
        inbox.setSourceModule(event.sourceModule());
        inbox.setEventType("system_message_create");
        inbox.setProducerEventId(event.producerEventId());
        inbox.setBizNo(event.bizNo());
        inbox.setReceiverUserId(event.receiverUserId());
        inbox.setPayloadCiphertext(encrypted.ciphertext());
        inbox.setPayloadIv(encrypted.iv());
        inbox.setPayloadKeyVersion(encrypted.keyVersion());
        inbox.setPayloadHmac(encrypted.hmac());
        inbox.setPayloadExpiresAt(effectiveNow.plusDays(7));
        inbox.setStatus("pending");
        inbox.setRetryCount(0);
        try {
            inboxDao.insert(inbox);
            return inbox.getId();
        } catch (DataIntegrityViolationException ex) {
            AppMessageEventInbox concurrent = inboxDao.selectByEventKey(eventKey);
            if (concurrent != null) {
                return concurrent.getId();
            }
            throw ex;
        }
    }

    private void requireEvent(SystemMessageEvent event) {
        if (event == null || !SOURCES.contains(event.sourceModule())
                || !StringUtils.hasText(event.producerEventId())
                || event.receiverUserId() == null
                || !StringUtils.hasText(event.templateCode())
                || !StringUtils.hasText(event.bizType())) {
            throw new BusinessException(4001, "系统消息事件参数不完整");
        }
    }

    private Map<String, Object> safeVariables(Map<String, Object> variables) {
        Map<String, Object> safe = variables == null ? Map.of() : Map.copyOf(variables);
        if (safe.keySet().stream().anyMatch(FORBIDDEN_PAYLOAD_KEYS::contains)) {
            throw new BusinessException(4001, "Inbox临时载荷禁止包含聊天正文");
        }
        return safe;
    }

    private String writePayload(SystemMessageEventPayload payload) {
        try {
            return objectMapper.copy().findAndRegisterModules().writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(30018, "系统消息事件序列化失败");
        }
    }
}
