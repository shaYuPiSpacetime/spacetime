package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 统一审核记录状态，数据库只保存这五种状态。
 */
@Getter
public enum AppUserAuditStatusEnum {
    PENDING("PENDING", "待审核"),
    REVIEWING("REVIEWING", "审核中"),
    APPROVED("APPROVED", "已通过"),
    REJECTED("REJECTED", "已驳回"),
    EXPIRED("EXPIRED", "已失效");

    private final String code;
    private final String desc;

    AppUserAuditStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static boolean isApproved(String status) {
        return APPROVED.code.equals(status);
    }

    public static boolean isPendingLike(String status) {
        return PENDING.code.equals(status) || REVIEWING.code.equals(status);
    }
}
