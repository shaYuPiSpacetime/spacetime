package com.spacetime.common.enums;

import lombok.Getter;

/** 单条解锁记录状态。 */
@Getter
public enum UnlockRecordStatusEnum {
    /** 权益有效。 */
    ACTIVE("active", "有效"),
    /** 权益已过期。 */
    EXPIRED("expired", "已过期"),
    /** 已完成特批退款。 */
    REFUNDED("refunded", "已退款");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    UnlockRecordStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
