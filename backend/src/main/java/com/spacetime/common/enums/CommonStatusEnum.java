package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 通用状态枚举：ENABLED=启用 / DISABLED=禁用
 * 用于 sys_user、sys_role、sys_menu 等表的 status 字段
 */
@Getter
public enum CommonStatusEnum {
    /** 启用 */
    ENABLED("ENABLED", "启用"),
    /** 禁用 */
    DISABLED("DISABLED", "禁用");

    /** 状态编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    CommonStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
