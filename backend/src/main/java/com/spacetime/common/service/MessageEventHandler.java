package com.spacetime.common.service;

import com.spacetime.common.entity.AppMessageEventInbox;

/** 单类消息中心上游事件处理器。 */
public interface MessageEventHandler {
    boolean supports(String sourceModule, String eventType);
    void handle(AppMessageEventInbox inbox);
}
