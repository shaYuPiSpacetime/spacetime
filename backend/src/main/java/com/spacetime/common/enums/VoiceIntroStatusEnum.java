package com.spacetime.common.enums;

import lombok.Getter;

@Getter
public enum VoiceIntroStatusEnum {
    NOT_SUBMITTED("NOT_SUBMITTED", "未提交"),
    VOICE_PENDING("VOICE_PENDING", "机审中"),
    VOICE_APPROVED("VOICE_APPROVED", "已通过"),
    VOICE_REJECTED("VOICE_REJECTED", "已驳回");

    private final String code;
    private final String desc;

    VoiceIntroStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
