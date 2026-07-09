package com.spacetime.common.enums;

import lombok.Getter;

/**
 * App 用户资料审核分组。
 */
@Getter
public enum AppUserAuditGroupEnum {
    CERTIFICATION("CERTIFICATION", "认证审核"),
    MEDIA("MEDIA", "媒体/图片审核"),
    TEXT("TEXT", "开放文字审核"),
    VOICE("VOICE", "语音介绍审核");

    private final String code;
    private final String desc;

    AppUserAuditGroupEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
