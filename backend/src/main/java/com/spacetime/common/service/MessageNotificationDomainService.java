package com.spacetime.common.service;

import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.model.message.SystemMessageEventPayload;

import java.time.LocalDateTime;

/** 官方助手与系统站内消息领域服务。 */
public interface MessageNotificationDomainService {
    String createSystemMessage(AppMessageEventInbox inbox, SystemMessageEventPayload payload,
                               LocalDateTime now);
    void ensureAssistantMessages(Long userId, LocalDateTime now);
}
