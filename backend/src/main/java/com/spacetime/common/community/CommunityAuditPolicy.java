package com.spacetime.common.community;

import org.springframework.stereotype.Component;

/**
 * PRD-05 内容审核状态机。这里只固定业务状态迁移，不固定展示文案。
 */
@Component
public class CommunityAuditPolicy {

    public CommunityAuditDecision decidePost(String contentType,
                                               CommunitySecurityResult securityResult,
                                               boolean machineAuditEnabled) {
        CommunitySecurityResult safeResult = securityResult == null
                ? CommunitySecurityResult.unavailable("empty_result") : securityResult;
        if (!machineAuditEnabled) {
            return decision("pending_manual", false, false, safeResult);
        }
        return switch (safeResult.conclusion()) {
            case PASS -> "sincere_post".equals(contentType)
                    ? decision("pending_manual", false, false, safeResult)
                    : decision("published", true, false, safeResult);
            case REJECT -> decision("rejected", false, false, safeResult);
            case REVIEW, UNAVAILABLE -> decision("pending_manual", false, false, safeResult);
        };
    }

    public CommunityAuditDecision decideComment(CommunitySecurityResult securityResult,
                                                  boolean machineAuditEnabled) {
        CommunitySecurityResult safeResult = securityResult == null
                ? CommunitySecurityResult.unavailable("empty_result") : securityResult;
        if (!machineAuditEnabled) {
            return decision("rejected", false, true, safeResult);
        }
        return switch (safeResult.conclusion()) {
            case PASS -> decision("published", false, false, safeResult);
            case REJECT -> decision("rejected", false, false, safeResult);
            case REVIEW, UNAVAILABLE -> decision("rejected", false, true, safeResult);
        };
    }

    private CommunityAuditDecision decision(String status,
                                              boolean sampleRequired,
                                              boolean retryRequired,
                                              CommunitySecurityResult result) {
        return new CommunityAuditDecision(status, sampleRequired, retryRequired,
                result.conclusion().name().toLowerCase(), result.providerCode(), result.detail());
    }
}
