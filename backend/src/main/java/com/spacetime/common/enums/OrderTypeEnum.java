package com.spacetime.common.enums;

/**
 * 订单类型
 */
public enum OrderTypeEnum {
    VIP("vip"),
    COIN("coin");

    private final String code;

    OrderTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
