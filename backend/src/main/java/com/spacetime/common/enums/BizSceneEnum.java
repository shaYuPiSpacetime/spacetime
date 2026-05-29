package com.spacetime.common.enums;

/**
 * 业务场景
 */
public enum BizSceneEnum {
    WHISPER("whisper"),
    LIKES_UNLOCK("likes_unlock"),
    VIEWERS_UNLOCK("viewers_unlock"),
    IDEAL_UNLOCK("ideal_unlock"),
    FEATURED_UNLOCK("featured_unlock"),
    COIN_RECHARGE("coin_recharge"),
    VIP_PURCHASE("vip_purchase"),
    PROMOTION_REWARD("promotion_reward"),
    REFUND_RETURN("refund_return");

    private final String code;

    BizSceneEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
