package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报处理动作
 */
@Getter
public enum CommunityReportHandleActionEnum {
    NONE("none", "不处罚"),
    BLOCK_POST("block_content", "下架内容"),
    BLOCK_COMMENT("block_comment", "屏蔽评论"),
    WARN_USER("warn_user", "警告用户"),
    MUTE_USER("mute_user", "禁言用户"),
    IP_BLOCK("ip_block", "IP 封禁"),
    FREEZE_USER("freeze_user", "冻结账号");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityReportHandleActionEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityReportHandleActionEnum getByCode(String code) {
        if ("DISMISS".equalsIgnoreCase(code)) return NONE;
        if ("BLOCK_POST".equalsIgnoreCase(code)) return BLOCK_POST;
        if ("BLOCK_COMMENT".equalsIgnoreCase(code)) return BLOCK_COMMENT;
        if ("WARN_USER".equalsIgnoreCase(code)) return WARN_USER;
        for (CommunityReportHandleActionEnum value : values()) {
            if (value.code.equalsIgnoreCase(code)) {
                return value;
            }
        }
        return null;
    }
}
