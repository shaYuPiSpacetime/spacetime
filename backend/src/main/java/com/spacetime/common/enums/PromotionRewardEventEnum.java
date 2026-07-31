package com.spacetime.common.enums;

/**
 * 奖励事件类型
 */
public enum PromotionRewardEventEnum {
    REGISTER_REWARD("register_reward", "邀请好友完成注册"),
    PROFILE_COMPLETE_REWARD("profile_complete_reward", "邀请好友完善资料"),
    VERIFY_COMPLETE_REWARD("verify_complete_reward", "邀请好友完成认证"),
    FIRST_VIP_REWARD("first_vip_reward", "邀请好友首次开通会员"),
    FIRST_COIN_RECHARGE_REWARD("first_coin_recharge_reward", "邀请好友首次充值"),
    LADDER_BONUS("ladder_bonus", null);

    private final String code;
    private final String mobileDisplayLabel;

    PromotionRewardEventEnum(String code, String mobileDisplayLabel) {
        this.code = code;
        this.mobileDisplayLabel = mobileDisplayLabel;
    }

    public String getCode() {
        return code;
    }

    /**
     * 返回面向邀请人的移动端文案；阶梯或未知事件保留原始快照。
     */
    public static String mobileDisplayLabel(String code, String fallback) {
        for (PromotionRewardEventEnum value : values()) {
            if (value.code.equals(code)) {
                return value.mobileDisplayLabel == null ? fallback : value.mobileDisplayLabel;
            }
        }
        return fallback;
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
