package com.spacetime.common.enums;

/**
 * 奖励状态
 */
public enum PromotionRewardStatusEnum {
    PENDING("pending"),
    SUCCESS("success"),
    FAILED("failed");

    private final String code;

    PromotionRewardStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    /**
     * 判断是否为正式状态值。
     */
    public static boolean supports(String code) {
        return PENDING.code.equals(code) || SUCCESS.code.equals(code) || FAILED.code.equals(code);
    }
}
