package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 社区互动准入模式
 */
@Getter
public enum CommunityGateModeEnum {
    LOGIN_ONLY("LOGIN_ONLY", "仅登录"),
    FULL_CERT("FULL_CERT", "需三项认证");

    private final String code;
    private final String desc;

    CommunityGateModeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityGateModeEnum getByCode(String code) {
        for (CommunityGateModeEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
