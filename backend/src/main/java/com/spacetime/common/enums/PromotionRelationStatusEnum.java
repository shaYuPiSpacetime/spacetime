package com.spacetime.common.enums;

/**
 * 邀请关系状态
 */
public enum PromotionRelationStatusEnum {
    CLICKED("clicked"),
    REGISTERED("registered"),
    LOGIN_SUCCESS("login_success"),
    PROFILE_COMPLETED("profile_completed"),
    VERIFY_SUCCESS("verify_success"),
    REWARDED("rewarded"),
    FROZEN("frozen"),
    INVALID("invalid");

    private final String code;

    PromotionRelationStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
