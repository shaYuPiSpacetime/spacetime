package com.spacetime.common.enums;

import lombok.Getter;

/** Inbox/Outbox 可靠任务状态及中文含义。 */
@Getter
public enum MessageReliableStatusEnum {
    PENDING("pending", "待处理"),
    PROCESSING("processing", "处理中"),
    SUCCESS("success", "处理成功"),
    SENT("sent", "已发送"),
    FAILED("failed", "失败待重试"),
    DEAD("dead", "死信");

    private final String code;
    private final String desc;

    MessageReliableStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
