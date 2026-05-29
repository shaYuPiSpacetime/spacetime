package com.spacetime.common.enums;

import lombok.Getter;

@Getter
public enum CancelRequestStatusEnum {
    COOLING_OFF("COOLING_OFF", "后悔期"),
    REVOKED("REVOKED", "已撤销"),
    CANCELLED("CANCELLED", "已注销"),
    BLOCKED("BLOCKED", "已阻断");

    private final String code;
    private final String desc;

    CancelRequestStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CancelRequestStatusEnum getByCode(String code) {
        for (CancelRequestStatusEnum e : values()) {
            if (e.code.equals(code)) {
                return e;
            }
        }
        return null;
    }
}
