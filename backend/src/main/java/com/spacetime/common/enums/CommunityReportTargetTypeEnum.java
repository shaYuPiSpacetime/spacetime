package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报目标类型
 */
@Getter
public enum CommunityReportTargetTypeEnum {
    POST("post", "动态"),
    COMMENT("comment", "评论"),
    USER("user", "用户"),
    CHAT("chat", "历史兼容聊天举报"),
    MESSAGE("message", "私信消息"),
    CONVERSATION("conversation", "私信会话"),
    WHISPER("whisper", "悄悄话");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
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

    public boolean isChatContext() {
        return this == CHAT || this == MESSAGE || this == CONVERSATION || this == WHISPER;
    }
}
