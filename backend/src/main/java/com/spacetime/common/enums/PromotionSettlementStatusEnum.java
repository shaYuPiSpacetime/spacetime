package com.spacetime.common.enums;

/**
 * 结算单状态
 */
public enum PromotionSettlementStatusEnum {
    UNSETTLED("unsettled"),
    /** 旧值兼容：待确认 */
    PENDING("pending"),
    CONFIRMED("confirmed"),
    PAID("paid");

    private final String code;

    PromotionSettlementStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static boolean isUnsettled(String code) {
        return UNSETTLED.code.equals(code) || PENDING.code.equals(code);
    }
}
