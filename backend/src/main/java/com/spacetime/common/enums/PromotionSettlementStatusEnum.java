package com.spacetime.common.enums;

/**
 * 结算单状态
 */
public enum PromotionSettlementStatusEnum {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    PAID("paid"),
    CANCELLED("cancelled");

    private final String code;

    PromotionSettlementStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
