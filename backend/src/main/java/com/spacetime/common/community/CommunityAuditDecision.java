package com.spacetime.common.community;

/**
 * 社区内容审核状态机决策。
 */
public record CommunityAuditDecision(
        String status,
        boolean sampleRequired,
        boolean retryRequired,
        String machineConclusion,
        String machineCode,
        String detail
) {
}
