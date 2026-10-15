package com.spacetime.common.community;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

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
    void authorizedStationPostPass_shouldPublishWithoutManualReview() {
        CommunityAuditDecision decision = policy.decidePost(
                "sincere_post", CommunitySecurityResult.pass("87014"), true);

        assertThat(decision.status()).isEqualTo("published");
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

    @ParameterizedTest
    @MethodSource("commentDecisions")
    void commentDecision_shouldPreserveConclusionAndQueueUncertainResults(
            CommunitySecurityResult result, boolean enabled, String status, String conclusion) {
        CommunityAuditDecision decision = policy.decideComment(result, enabled);

        assertThat(decision.status()).isEqualTo(status);
        assertThat(decision.retryRequired()).isFalse();
        assertThat(decision.sampleRequired()).isFalse();
        assertThat(decision.machineConclusion()).isEqualTo(conclusion);
        assertThat(decision.machineCode()).isEqualTo(result == null ? null : result.providerCode());
        assertThat(decision.detail()).isEqualTo(result == null ? "empty_result" : result.detail());
    }

    private static Stream<Arguments> commentDecisions() {
        return Stream.of(
                Arguments.of(CommunitySecurityResult.pass("0"), true, "published", "pass"),
                Arguments.of(CommunitySecurityResult.reject("87014", "risky"), true, "rejected", "reject"),
                Arguments.of(CommunitySecurityResult.review("uncertain"), true, "pending", "review"),
                Arguments.of(CommunitySecurityResult.unavailable("timeout"), true, "pending", "unavailable"),
                Arguments.of(null, true, "pending", "unavailable"),
                Arguments.of(CommunitySecurityResult.unavailable("machine_audit_disabled"), false, "pending", "unavailable"));
    }
}
