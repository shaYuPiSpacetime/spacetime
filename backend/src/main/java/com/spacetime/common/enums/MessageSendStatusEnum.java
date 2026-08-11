package com.spacetime.common.enums;

import lombok.Getter;

/** 私信消息发送状态。 */
@Getter
public enum MessageSendStatusEnum {
    QUEUED("queued", "待投递"),
    SENT("sent", "已发送"),
    FAILED("failed", "发送失败");

    private final String code;
    private final String desc;

    MessageSendStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
