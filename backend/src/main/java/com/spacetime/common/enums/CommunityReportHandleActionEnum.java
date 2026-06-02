package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报处理动作
 */
@Getter
public enum CommunityReportHandleActionEnum {
    DISMISS("DISMISS", "驳回举报"),
    BLOCK_POST("BLOCK_POST", "下架动态"),
    BLOCK_COMMENT("BLOCK_COMMENT", "屏蔽评论"),
    WARN_USER("WARN_USER", "警告用户");

    private final String code;
    private final String desc;

    CommunityReportHandleActionEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityReportHandleActionEnum getByCode(String code) {
        for (CommunityReportHandleActionEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
