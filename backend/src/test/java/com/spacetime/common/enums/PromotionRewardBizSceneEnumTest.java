package com.spacetime.common.enums;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 推广奖励资产流水场景映射测试。
 */
class PromotionRewardBizSceneEnumTest {

    @Test
    void 六类奖励事件严格映射到PRD04业务场景() {
        assertThat(PromotionRewardBizSceneEnum.fromEventType("register_reward"))
                .isEqualTo("invite_register_reward");
        assertThat(PromotionRewardBizSceneEnum.fromEventType("profile_complete_reward"))
                .isEqualTo("invite_profile_reward");
        assertThat(PromotionRewardBizSceneEnum.fromEventType("verify_complete_reward"))
                .isEqualTo("invite_verify_reward");
        assertThat(PromotionRewardBizSceneEnum.fromEventType("first_vip_reward"))
                .isEqualTo("invite_first_vip_reward");
        assertThat(PromotionRewardBizSceneEnum.fromEventType("first_coin_recharge_reward"))
                .isEqualTo("invite_first_coin_reward");
        assertThat(PromotionRewardBizSceneEnum.fromEventType("ladder_bonus"))
                .isEqualTo("invite_ladder_reward");
    }
}
