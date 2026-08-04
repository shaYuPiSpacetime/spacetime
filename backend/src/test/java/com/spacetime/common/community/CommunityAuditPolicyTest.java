package com.spacetime.common.community;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PRD-05 内容安全状态机")
class CommunityAuditPolicyTest {

    private final CommunityAuditPolicy policy = new CommunityAuditPolicy();

    @Test
    void normalPostPass_shouldPublishAndSample() {
        CommunityAuditDecision decision = policy.decidePost(
                "community_post", CommunitySecurityResult.pass("87014"), true);

        assertThat(decision.status()).isEqualTo("published");
        assertThat(decision.sampleRequired()).isTrue();
    }

    @Test
    void sincerePostPass_shouldWaitForManualReview() {
        CommunityAuditDecision decision = policy.decidePost(
                "sincere_post", CommunitySecurityResult.pass("87014"), true);

        assertThat(decision.status()).isEqualTo("pending_manual");
        assertThat(decision.sampleRequired()).isFalse();
    }

    @Test
    void postUncertainOrUnavailable_shouldFailSafeToManualReview() {
        assertThat(policy.decidePost("community_post", CommunitySecurityResult.review("risk"), true).status())
                .isEqualTo("pending_manual");
        assertThat(policy.decidePost("community_post", CommunitySecurityResult.unavailable("timeout"), true).status())
                .isEqualTo("pending_manual");
        assertThat(policy.decidePost("community_post", CommunitySecurityResult.pass("disabled"), false).status())
                .isEqualTo("pending_manual");
    }

    @Test
    void commentUnavailable_shouldRequireRetryInsteadOfManualQueue() {
        CommunityAuditDecision decision = policy.decideComment(CommunitySecurityResult.unavailable("timeout"), true);

        assertThat(decision.retryRequired()).isTrue();
        assertThat(decision.status()).isEqualTo("rejected");
    }
}
