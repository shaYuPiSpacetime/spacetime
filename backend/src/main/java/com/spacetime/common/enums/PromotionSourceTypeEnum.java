package com.spacetime.common.enums;

/**
 * 推广来源类型
 */
public enum PromotionSourceTypeEnum {
    USER_QR("user_qr"),
    AGENT_QR("agent_qr");

    private final String code;

    PromotionSourceTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
