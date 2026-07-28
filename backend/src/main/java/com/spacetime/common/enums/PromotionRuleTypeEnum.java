package com.spacetime.common.enums;

/**
 * 推广奖励模式。
 */
public enum PromotionRuleTypeEnum {
    FIXED("fixed"),
    LADDER("ladder");

    private final String code;

    PromotionRuleTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
