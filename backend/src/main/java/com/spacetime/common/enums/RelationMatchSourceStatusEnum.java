package com.spacetime.common.enums;

import lombok.Getter;

/** 匹配来源明细状态。 */
@Getter
public enum RelationMatchSourceStatusEnum {
    /** 来源有效。 */
    ACTIVE("active", "有效"),
    /** 来源被单独撤销。 */
    REVOKED("revoked", "来源已撤销"),
    /** 来源随整个匹配关系失效。 */
    INVALID("invalid", "随关系失效");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationMatchSourceStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
