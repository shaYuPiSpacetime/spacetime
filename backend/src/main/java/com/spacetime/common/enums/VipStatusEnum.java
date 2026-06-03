package com.spacetime.common.enums;

/**
 * VIP状态
 */
public enum VipStatusEnum {
    INACTIVE("inactive"),
    ACTIVE("active"),
    EXPIRED("expired");

    /** 枚举编码 */
    private final String code;

    VipStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
