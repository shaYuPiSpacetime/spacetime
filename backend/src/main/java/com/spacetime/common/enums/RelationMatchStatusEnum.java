package com.spacetime.common.enums;

import lombok.Getter;

/** 匹配生命周期状态。 */
@Getter
public enum RelationMatchStatusEnum {
    /** 匹配有效。 */
    MATCHED("matched", "匹配有效"),
    /** 匹配失效。 */
    INVALID("invalid", "匹配失效");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationMatchStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
