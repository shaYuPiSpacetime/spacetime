package com.spacetime.common.enums;

/**
 * 推广来源类型
 */
public enum PromotionSourceTypeEnum {
    NORMAL_USER("normal_user"),
    CAMPUS_AGENT("campus_agent"),
    /** 旧值兼容：普通用户二维码 */
    USER_QR("user_qr"),
    /** 旧值兼容：校园代理二维码 */
    AGENT_QR("agent_qr");

    private final String code;

    PromotionSourceTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static String normalize(String code) {
        if (USER_QR.code.equals(code)) {
            return NORMAL_USER.code;
        }
        if (AGENT_QR.code.equals(code)) {
            return CAMPUS_AGENT.code;
        }
        return code;
    }

    public static boolean isNormalUser(String code) {
        return NORMAL_USER.code.equals(code) || USER_QR.code.equals(code);
    }

    public static boolean isCampusAgent(String code) {
        return CAMPUS_AGENT.code.equals(code) || AGENT_QR.code.equals(code);
    }
}
