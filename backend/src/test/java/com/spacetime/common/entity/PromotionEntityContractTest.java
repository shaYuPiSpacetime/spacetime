package com.spacetime.common.entity;

import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.enums.PromotionSettlementStatusEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PRD-07 推广领域实体和枚举契约测试。
 */
class PromotionEntityContractTest {

    @Test
    void 正式枚举只包含新版业务值() {
        assertThat(codes(PromotionSourceTypeEnum.values()))
                .containsExactlyInAnyOrder("normal_user", "campus_agent");
        assertThat(codes(PromotionRewardStatusEnum.values()))
                .containsExactlyInAnyOrder("pending", "success", "failed");
        assertThat(codes(PromotionAgentStatusEnum.values()))
                .containsExactlyInAnyOrder("enabled", "disabled");
        assertThat(codes(PromotionSettlementStatusEnum.values()))
                .containsExactlyInAnyOrder("pending_confirm", "confirmed");
        assertThat(codes(PromotionRewardEventEnum.values()))
                .containsExactlyInAnyOrder(
                        "register_reward",
                        "profile_complete_reward",
                        "verify_complete_reward",
                        "first_vip_reward",
                        "first_coin_recharge_reward",
                        "ladder_bonus");
    }

    @Test
    void 永久邀请关系不包含状态风险或失效字段() {
        Set<String> fields = fieldNames(PromotionInviteRelation.class);
        assertThat(fields).contains(
                "relationNo", "sourceTraceId", "sourceType",
                "inviterId", "agentId", "inviteeId", "registeredAt");
        assertThat(fields).doesNotContain(
                "status", "frozenBeforeStatus", "invalidReason",
                "riskReason", "expireTime");
    }

    @Test
    void 奖励流水保存版本快照幂等与补偿证据() {
        assertThat(fieldNames(PromotionRewardLog.class)).contains(
                "eventType", "eventLabelSnapshot", "ruleId", "ruleVersion",
                "ladderThreshold", "idempotencyKey", "retryCount",
                "nextRetryTime", "lastRetryTime", "failureReason",
                "coinLogId", "successTime");
    }

    @Test
    void 代理奖金无独立状态且结算无打款字段() {
        assertThat(fieldNames(PromotionAgentBonusLog.class))
                .contains("idempotencyKey", "settlementId")
                .doesNotContain("status");
        assertThat(fieldNames(PromotionAgentSettlement.class))
                .contains("settlementMonth", "status", "confirmedBy", "confirmedTime")
                .doesNotContain("paidAmount", "paidTime");
    }

    private Set<String> fieldNames(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());
    }

    private Set<String> codes(Object[] values) {
        return Arrays.stream(values)
                .map(value -> {
                    try {
                        return (String) value.getClass().getMethod("getCode").invoke(value);
                    } catch (ReflectiveOperationException ex) {
                        throw new AssertionError(ex);
                    }
                })
                .collect(Collectors.toSet());
    }
}
