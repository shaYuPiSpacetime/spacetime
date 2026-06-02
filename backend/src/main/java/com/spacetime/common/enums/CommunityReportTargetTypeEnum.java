package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报目标类型
 */
@Getter
public enum CommunityReportTargetTypeEnum {
    POST("post", "动态"),
    COMMENT("comment", "评论"),
    USER("user", "用户");

    private final String code;
    private final String desc;

    CommunityReportTargetTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityReportTargetTypeEnum getByCode(String code) {
        for (CommunityReportTargetTypeEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
