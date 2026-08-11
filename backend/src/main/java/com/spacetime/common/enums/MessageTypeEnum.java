package com.spacetime.common.enums;

import lombok.Getter;

/** 私信消息内容类型。 */
@Getter
public enum MessageTypeEnum {
    TEXT("text", "普通文本"),
    WHISPER("whisper", "原悄悄话"),
    WHISPER_REPLY("whisper_reply", "悄悄话回复"),
    SYSTEM_TIP("system_tip", "系统提示");

    private final String code;
    private final String desc;

    MessageTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
