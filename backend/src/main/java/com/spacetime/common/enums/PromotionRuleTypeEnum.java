package com.spacetime.common.enums;

/**
 * 推广规则类型
 */
public enum PromotionRuleTypeEnum {
    USER_INVITE("user_invite"),
    AGENT_BONUS("agent_bonus"),
    RISK_CONTROL("risk_control");

    private final String code;

    PromotionRuleTypeEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
