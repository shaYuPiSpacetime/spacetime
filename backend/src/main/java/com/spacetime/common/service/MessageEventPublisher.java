package com.spacetime.common.service;

import com.spacetime.common.model.message.SystemMessageEvent;

import java.time.LocalDateTime;

/** 跨模块系统消息事件可靠入箱边界。 */
public interface MessageEventPublisher {
    Long publishSystemMessage(SystemMessageEvent event, LocalDateTime now);
}
