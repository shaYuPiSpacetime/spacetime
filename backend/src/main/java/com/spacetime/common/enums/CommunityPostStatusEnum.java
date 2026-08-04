package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 社区内容发布状态
 */
@Getter
public enum CommunityPostStatusEnum {
    DRAFT("draft", "草稿"),
    PENDING("pending_machine", "机审中"),
    PENDING_MANUAL("pending_manual", "待人工复核"),
    PUBLISHED("published", "已公开"),
    REJECTED("rejected", "已驳回"),
    DELETED("deleted", "用户已删除"),
    BLOCKED("blocked", "已下架");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityPostStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static boolean matches(CommunityPostStatusEnum expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        if (expected.code.equalsIgnoreCase(actual)) {
            return true;
        }
        return expected == PENDING && "PENDING".equalsIgnoreCase(actual);
    }
}
