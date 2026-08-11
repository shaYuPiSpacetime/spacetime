package com.spacetime.common.enums;

import lombok.Getter;

/** 私信消息接收方已读状态。 */
@Getter
public enum MessageReadStatusEnum {
    NOT_APPLICABLE("not_applicable", "未送达或不适用"),
    UNREAD("unread", "未读"),
    READ("read", "已读");

    private final String code;
    private final String desc;

    MessageReadStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
