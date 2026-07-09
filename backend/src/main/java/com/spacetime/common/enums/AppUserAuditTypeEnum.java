package com.spacetime.common.enums;

import lombok.Getter;

/**
 * App 用户统一审核类型。
 */
@Getter
public enum AppUserAuditTypeEnum {
    REAL_NAME("REAL_NAME", AppUserAuditGroupEnum.CERTIFICATION.getCode(), "实名认证"),
    AVATAR("AVATAR", AppUserAuditGroupEnum.CERTIFICATION.getCode(), "头像认证"),
    EDUCATION("EDUCATION", AppUserAuditGroupEnum.CERTIFICATION.getCode(), "学历认证"),
    ALBUM_PHOTO("ALBUM_PHOTO", AppUserAuditGroupEnum.MEDIA.getCode(), "相册照片"),
    PROFILE_BG("PROFILE_BG", AppUserAuditGroupEnum.MEDIA.getCode(), "资料背景图"),
    ABOUT_ME("ABOUT_ME", AppUserAuditGroupEnum.TEXT.getCode(), "关于我"),
    HOPE_THEY_KNOW("HOPE_THEY_KNOW", AppUserAuditGroupEnum.TEXT.getCode(), "希望 TA 了解"),
    PROFILE_QA("PROFILE_QA", AppUserAuditGroupEnum.TEXT.getCode(), "资料问答开放回答"),
    VOICE_INTRO("VOICE_INTRO", AppUserAuditGroupEnum.VOICE.getCode(), "语音介绍");

    private final String code;
    private final String group;
    private final String desc;

    AppUserAuditTypeEnum(String code, String group, String desc) {
        this.code = code;
        this.group = group;
        this.desc = desc;
    }

    public static AppUserAuditTypeEnum getByCode(String code) {
        for (AppUserAuditTypeEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
