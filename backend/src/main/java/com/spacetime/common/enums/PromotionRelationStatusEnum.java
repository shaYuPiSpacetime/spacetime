package com.spacetime.common.enums;

/**
 * 邀请关系状态
 */
public enum PromotionRelationStatusEnum {
    REGISTERED("registered"),
    PROFILE_COMPLETED("profile_completed"),
    VERIFY_SUCCESS("verify_success");

    private final String code;

    PromotionRelationStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
