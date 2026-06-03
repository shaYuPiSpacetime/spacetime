package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 认证状态（实名/学历/头像共用）
 */
@Getter
public enum VerificationStatusEnum {
    NOT_CERTIFIED("NOT_CERTIFIED", "未认证"),
    PENDING("PENDING", "审核中"),
    APPROVED("APPROVED", "已通过"),
    REJECTED("REJECTED", "已拒绝"),
    EXPIRED("EXPIRED", "已失效");

    private final String code;
    private final String desc;

    VerificationStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static VerificationStatusEnum getByCode(String code) {
        for (VerificationStatusEnum value : values()) {
            if (value.code.equals(code)) return value;
        }
        return null;
    }
}
