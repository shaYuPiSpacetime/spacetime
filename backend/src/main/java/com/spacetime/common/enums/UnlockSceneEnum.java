package com.spacetime.common.enums;

/**
 * 解锁场景
 */
public enum UnlockSceneEnum {
    LIKES("likes"),
    VIEWERS("viewers"),
    IDEAL_USER("ideal_user"),
    FEATURED_PROFILE("featured_profile");

    /** 枚举编码 */
    private final String code;

    UnlockSceneEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
