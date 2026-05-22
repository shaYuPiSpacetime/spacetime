package com.spacetime.common.enums;

/**
 * 奖励事件类型
 */
public enum PromotionRewardEventEnum {
    REGISTER_LOGIN_REWARD("register_login_reward"),
    PROFILE_COMPLETE_REWARD("profile_complete_reward"),
    VERIFY_COMPLETE_REWARD("verify_complete_reward"),
    LADDER_REWARD("ladder_reward"),
    FIRST_VIP_REWARD("first_vip_reward"),
    FIRST_COIN_RECHARGE_REWARD("first_coin_recharge_reward");

    private final String code;

    PromotionRewardEventEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
