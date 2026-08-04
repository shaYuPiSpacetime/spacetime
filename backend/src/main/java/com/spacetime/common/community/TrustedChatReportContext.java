package com.spacetime.common.community;

/**
 * 由 PRD-03 服务端解析器返回的可信聊天举报上下文。
 */
public record TrustedChatReportContext(
        String targetNo,
        Long targetUserId,
        String sourceType,
        String evidenceJson
) {
}
