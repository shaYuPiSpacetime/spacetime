package com.spacetime.common.enums;

/**
 * 推广来源类型
 */
public enum PromotionSourceTypeEnum {
    NORMAL_USER("normal_user"),
    CAMPUS_AGENT("campus_agent");

    private final String code;

    PromotionSourceTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static boolean isNormalUser(String code) {
        return NORMAL_USER.code.equals(code);
    }

    public static boolean isCampusAgent(String code) {
        return CAMPUS_AGENT.code.equals(code);
    }

    /**
     * 判断是否为正式来源值。
     */
    public static boolean supports(String code) {
        return isNormalUser(code) || isCampusAgent(code);
    }
}
