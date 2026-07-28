package com.spacetime.common.enums;

/**
 * 结算单状态
 */
public enum PromotionSettlementStatusEnum {
    PENDING_CONFIRM("pending_confirm"),
    CONFIRMED("confirmed");

    private final String code;

    PromotionSettlementStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static boolean supports(String code) {
        return PENDING_CONFIRM.code.equals(code) || CONFIRMED.code.equals(code);
    }
}
