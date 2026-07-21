package com.spacetime.common.enums;

import lombok.Getter;

@Getter
public enum OpenTextFieldEnum {
    ABOUT_ME("ABOUT_ME", "关于我"),
    PROFILE_QA("PROFILE_QA", "资料问答开放回答");

    private final String code;
    private final String desc;

    OpenTextFieldEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static OpenTextFieldEnum getByCode(String code) {
        for (OpenTextFieldEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
