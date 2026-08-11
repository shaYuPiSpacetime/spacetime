package com.spacetime.common.enums;

import lombok.Getter;

/** 腾讯云 TIM 用户账号同步状态及中文含义。 */
@Getter
public enum ImAccountSyncStatusEnum {
    PENDING("pending", "待同步"),
    SYNCED("synced", "已同步"),
    DISABLED("disabled", "已禁用"),
    FAILED("failed", "同步失败");

    private final String code;
    private final String desc;

    ImAccountSyncStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
