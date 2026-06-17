package com.spacetime.common.enums;

/**
 * 风控命中原因
 */
public enum PromotionRiskReasonEnum {
    SAME_DEVICE("same_device"),
    SAME_PHONE("same_phone"),
    SELF_INVITE("self_invite"),
    SAME_PAYMENT("same_payment"),
    SAME_IDENTITY("same_identity"),
    MANUAL_RULE("manual_rule");

    private final String code;

    PromotionRiskReasonEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
