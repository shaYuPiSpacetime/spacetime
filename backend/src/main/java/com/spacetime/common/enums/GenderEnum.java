package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 性别，提交后不可修改
 */
@Getter
public enum GenderEnum {
    MALE("MALE", "男"),
    FEMALE("FEMALE", "女");

    private final String code;
    private final String desc;

    GenderEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static GenderEnum getByCode(String code) {
        for (GenderEnum value : values()) {
            if (value.code.equals(code)) return value;
        }
        return null;
    }
}
