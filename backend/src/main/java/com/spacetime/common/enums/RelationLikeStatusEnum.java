package com.spacetime.common.enums;

import lombok.Getter;

/** 喜欢关系状态。 */
@Getter
public enum RelationLikeStatusEnum {
    /** 有效。 */
    ACTIVE("active", "有效"),
    /** 已取消。 */
    CANCELLED("cancelled", "已取消"),
    /** 已失效。 */
    INVALID("invalid", "已失效");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationLikeStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
