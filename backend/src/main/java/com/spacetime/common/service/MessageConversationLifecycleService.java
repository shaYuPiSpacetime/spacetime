package com.spacetime.common.service;

import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppRelationMatch;

import java.time.LocalDateTime;

/** 将匹配生命周期投影为私信会话，并同步处理会话终态。 */
public interface MessageConversationLifecycleService {
    AppMessageConversation ensureForMatch(AppRelationMatch match, String sourceType,
                                          LocalDateTime effectiveTime);

    void invalidateForMatch(AppRelationMatch match, String reason, LocalDateTime invalidTime);
}
