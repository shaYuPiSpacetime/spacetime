package com.spacetime.common.enums;

/**
 * 校园推广员状态。
 */
public enum PromotionAgentStatusEnum {
    ENABLED("enabled"),
    DISABLED("disabled");

    private final String code;

    PromotionAgentStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    /**
     * 判断是否为正式状态值。
     */
    public static boolean supports(String code) {
        return ENABLED.code.equals(code) || DISABLED.code.equals(code);
    }
}
