package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 千寻知音内容归属模块。
 */
@Getter
public enum CommunityZhiyinSectionEnum {
    SOULMATE("soulmate", "心灵搭子"),
    STATION("station", "时空站台");

    private final String code;
    private final String desc;

    CommunityZhiyinSectionEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityZhiyinSectionEnum getByCode(String code) {
        if (code == null) return null;
        for (CommunityZhiyinSectionEnum value : values()) {
            if (value.code.equalsIgnoreCase(code.trim())) return value;
        }
        return null;
    }
}
