package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 账号状态
 */
@Getter
public enum AccountStatusEnum {
    NORMAL("NORMAL", "正常"),
    FROZEN("FROZEN", "已冻结"),
    CANCELLING("CANCELLING", "注销中"),
    CANCELLED("CANCELLED", "已注销");

    private final String code;
    private final String desc;

    AccountStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static AccountStatusEnum getByCode(String code) {
        for (AccountStatusEnum value : values()) {
            if (value.code.equals(code)) return value;
        }
        return null;
    }
}
