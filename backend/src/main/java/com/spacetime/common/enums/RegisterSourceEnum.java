package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 注册来源
 */
@Getter
public enum RegisterSourceEnum {
    WECHAT("WECHAT", "微信授权"),
    AGENT_CODE("AGENT_CODE", "代理码");

    private final String code;
    private final String desc;

    RegisterSourceEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static RegisterSourceEnum getByCode(String code) {
        for (RegisterSourceEnum value : values()) {
            if (value.code.equals(code)) return value;
        }
        return null;
    }
}
