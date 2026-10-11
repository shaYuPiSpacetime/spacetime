package com.spacetime.common.service;

import com.spacetime.common.entity.AppMessageConversation;

/** 女性保护快照与当前零天配置的统一判定。 */
public interface MessageFemaleProtectionService {
    /** 当前零天配置覆盖历史快照；其他配置继续使用会话快照。 */
    boolean isEnabled(AppMessageConversation conversation);
}
