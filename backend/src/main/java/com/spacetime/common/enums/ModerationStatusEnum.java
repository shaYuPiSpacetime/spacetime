package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 资料内容审核状态（照片/文字共用）
 */
@Getter
public enum ModerationStatusEnum {
    NOT_SUBMITTED("NOT_SUBMITTED", "未提交"),
    PENDING("PENDING", "审核中"),
    APPROVED("APPROVED", "已通过"),
    REJECTED("REJECTED", "已拒绝");

    private final String code;
    private final String desc;

    ModerationStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static ModerationStatusEnum getByCode(String code) {
        for (ModerationStatusEnum value : values()) {
            if (value.code.equals(code)) return value;
        }
        return null;
    }
}
