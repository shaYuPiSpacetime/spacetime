package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 社区内容审核状态
 */
@Getter
public enum CommunityAuditStatusEnum {
    PENDING("PENDING", "待审核"),
    APPROVED("APPROVED", "审核通过"),
    REJECTED("REJECTED", "审核驳回");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityAuditStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityAuditStatusEnum getByCode(String code) {
        for (CommunityAuditStatusEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
