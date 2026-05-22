package com.spacetime.common.enums;

/**
 * 奖励状态
 */
public enum PromotionRewardStatusEnum {
    PENDING("pending"),
    SUCCESS("success"),
    FROZEN("frozen"),
    INVALID("invalid");

    private final String code;

    PromotionRewardStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
