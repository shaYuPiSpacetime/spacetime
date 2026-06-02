package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 社区内容类型
 */
@Getter
public enum CommunityPostTypeEnum {
    COMMUNITY("community", "社区动态"),
    SINCERE_POST("sincere_post", "诚意贴");

    private final String code;
    private final String desc;

    CommunityPostTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityPostTypeEnum getByCode(String code) {
        for (CommunityPostTypeEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
