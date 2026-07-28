package com.spacetime.common.enums;

/**
 * 奖励事件类型
 */
public enum PromotionRewardEventEnum {
    REGISTER_REWARD("register_reward"),
    PROFILE_COMPLETE_REWARD("profile_complete_reward"),
    VERIFY_COMPLETE_REWARD("verify_complete_reward"),
    FIRST_VIP_REWARD("first_vip_reward"),
    FIRST_COIN_RECHARGE_REWARD("first_coin_recharge_reward"),
    LADDER_BONUS("ladder_bonus");

    private final String code;

    PromotionRewardEventEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    /**
     * 判断是否为正式奖励事件。
     */
    public static boolean supports(String code) {
        for (PromotionRewardEventEnum value : values()) {
            if (value.code.equals(code)) {
                return true;
            }
        }
        return false;
    }
}
