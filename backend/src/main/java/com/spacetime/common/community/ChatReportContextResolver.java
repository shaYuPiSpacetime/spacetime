package com.spacetime.common.community;

/**
 * PRD-03 聊天举报解析端口。PRD-05 不实现消息域查询。
 */
public interface ChatReportContextResolver {
    TrustedChatReportContext resolve(Long reporterId, ChatReportLookup lookup);
}
