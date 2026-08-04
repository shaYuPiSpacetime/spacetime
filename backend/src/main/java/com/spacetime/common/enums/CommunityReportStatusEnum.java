package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报单状态
 */
@Getter
public enum CommunityReportStatusEnum {
    PENDING("pending", "待处理"),
    PROCESSING("processing", "处理中"),
    VALID("valid", "举报成立"),
    INVALID("invalid", "举报不成立"),
    MERGED("merged", "已合并");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityReportStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityReportStatusEnum getByCode(String code) {
        if ("RESOLVED".equalsIgnoreCase(code)) {
            return VALID;
        }
        if ("REJECTED".equalsIgnoreCase(code)) {
            return INVALID;
        }
        for (CommunityReportStatusEnum value : values()) {
            if (value.code.equalsIgnoreCase(code)) {
                return value;
            }
        }
        return null;
    }
}
