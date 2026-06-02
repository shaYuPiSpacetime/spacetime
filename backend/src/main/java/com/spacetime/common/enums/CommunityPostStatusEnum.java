package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 社区内容发布状态
 */
@Getter
public enum CommunityPostStatusEnum {
    PENDING("PENDING", "待发布"),
    PUBLISHED("PUBLISHED", "已发布"),
    REJECTED("REJECTED", "已驳回"),
    DELETED("DELETED", "已删除"),
    BLOCKED("BLOCKED", "已屏蔽");

    private final String code;
    private final String desc;

    CommunityPostStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
