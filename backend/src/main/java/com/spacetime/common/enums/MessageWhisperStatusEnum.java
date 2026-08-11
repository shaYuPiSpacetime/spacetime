package com.spacetime.common.enums;

import lombok.Getter;

/** 悄悄话申请生命周期状态。 */
@Getter
public enum MessageWhisperStatusEnum {
    PENDING("pending", "待回复"),
    REPLIED("replied", "已回复并匹配"),
    EXPIRED("expired", "已过期"),
    INVALID("invalid", "已失效");

    private final String code;
    private final String desc;

    MessageWhisperStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
