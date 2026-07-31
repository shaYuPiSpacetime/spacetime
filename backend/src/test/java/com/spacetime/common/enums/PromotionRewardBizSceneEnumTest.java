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

    @Test
    void 移动端邀请奖励文案明确描述好友行为() {
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_register_reward", "完成注册"))
                .isEqualTo("邀请好友完成注册");
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_profile_reward", "完善资料"))
                .isEqualTo("邀请好友完善资料");
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_verify_reward", "完成认证"))
                .isEqualTo("邀请好友完成认证");
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_first_vip_reward", "首次开通会员"))
                .isEqualTo("邀请好友首次开通会员");
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_first_coin_reward", "首次充值千寻币"))
                .isEqualTo("邀请好友首次充值");
        assertThat(PromotionRewardBizSceneEnum.mobileDisplayLabel(
                "invite_ladder_reward", "阶梯奖励-累计3人"))
                .isEqualTo("阶梯奖励-累计3人");
    }
}
