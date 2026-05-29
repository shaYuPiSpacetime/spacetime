package com.spacetime.common.enums;

/**
 * 成家币流水类型
 */
public enum FlowTypeEnum {
    RECHARGE("recharge"),
    CONSUME("consume"),
    GIFT("gift"),
    REFUND("refund");

    private final String code;

    FlowTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
