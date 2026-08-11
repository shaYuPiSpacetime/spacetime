package com.spacetime.common.community;

import java.util.List;

/**
 * 由 PRD-03 服务端解析器返回的可信聊天举报上下文。
 */
public record TrustedChatReportContext(
        String targetNo,
        Long targetUserId,
        String sourceType,
        String evidenceJson,
        Long targetMessageId,
        List<Long> evidenceMessageIds,
        String conversationNo,
        String snapshotStatus
) {
    public TrustedChatReportContext(String targetNo, Long targetUserId, String sourceType,
                                    String evidenceJson) {
        this(targetNo, targetUserId, sourceType, evidenceJson,
                null, List.of(), null, "partial");
    }
}
