package com.spacetime.common.enums;

/**
 * 推广来源类型
 */
public enum PromotionSourceTypeEnum {
    SHARE_CARD("share_card"),
    POSTER("poster"),
    INVITE_CODE("invite_code"),
    AGENT_CODE("agent_code");

    private final String code;

    PromotionSourceTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
