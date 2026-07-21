package com.spacetime.common.enums;

import lombok.Getter;

/** 访客展示记录状态。 */
@Getter
public enum RelationVisitStatusEnum {
    /** 窗口内可见。 */
    VISIBLE("visible", "窗口内可见"),
    /** 已超前台展示窗口。 */
    EXPIRED_WINDOW("expired_window", "已超展示窗口"),
    /** 关系已失效。 */
    INVALID("invalid", "关系已失效");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationVisitStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
