package com.spacetime.common.enums;

/**
 * 代理奖金状态
 */
public enum PromotionBonusStatusEnum {
    PENDING_SETTLEMENT("pending_settlement"),
    CONFIRMED("confirmed"),
    PAID("paid"),
    CANCELLED("cancelled");

    private final String code;

    PromotionBonusStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
