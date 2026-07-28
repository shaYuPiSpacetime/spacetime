package com.spacetime.common.enums;

/**
 * PRD-07 奖励事件到 PRD-04 千寻币业务场景的固定映射。
 */
public enum PromotionRewardBizSceneEnum {
    REGISTER("register_reward", "invite_register_reward"),
    PROFILE_COMPLETE("profile_complete_reward", "invite_profile_reward"),
    VERIFY_COMPLETE("verify_complete_reward", "invite_verify_reward"),
    FIRST_VIP("first_vip_reward", "invite_first_vip_reward"),
    FIRST_COIN_RECHARGE("first_coin_recharge_reward", "invite_first_coin_reward"),
    LADDER("ladder_bonus", "invite_ladder_reward");

    private final String eventType;
    private final String bizScene;

    PromotionRewardBizSceneEnum(String eventType, String bizScene) {
        this.eventType = eventType;
        this.bizScene = bizScene;
    }

    public String getEventType() {
        return eventType;
    }

    public String getBizScene() {
        return bizScene;
    }

    public static String fromEventType(String eventType) {
        for (PromotionRewardBizSceneEnum value : values()) {
            if (value.eventType.equals(eventType)) {
                return value.bizScene;
            }
        }
        throw new IllegalArgumentException("不支持的推广奖励事件");
    }
}
