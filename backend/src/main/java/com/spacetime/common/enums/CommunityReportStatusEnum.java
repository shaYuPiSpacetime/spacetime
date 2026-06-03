package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 举报单状态
 */
@Getter
public enum CommunityReportStatusEnum {
    PENDING("PENDING", "待处理"),
    RESOLVED("RESOLVED", "已处理"),
    REJECTED("REJECTED", "已驳回");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityReportStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CommunityReportStatusEnum getByCode(String code) {
        for (CommunityReportStatusEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }
}
