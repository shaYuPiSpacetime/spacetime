package com.spacetime.common.enums;

/**
 * 订单状态
 */
public enum OrderStatusEnum {
    UNPAID("unpaid"),
    SUCCESS("success"),
    CLOSED("closed"),
    FAILED("failed"),
    REFUNDING("refunding"),
    REFUNDED("refunded");

    private final String code;

    OrderStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
