package com.spacetime.common.enums;

import lombok.Getter;

/** 私信会话生命周期状态。 */
@Getter
public enum MessageConversationStatusEnum {
    ACTIVE("active", "可用"),
    BLOCKED("blocked", "已拉黑"),
    INVALID("invalid", "已失效");

    private final String code;
    private final String desc;

    MessageConversationStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
