package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 跳转类型枚举
 */
@Getter
public enum JumpTypeEnum {
    /** 小程序原生路由 */
    NATIVE_ROUTE("NATIVE_ROUTE", "小程序原生路由"),
    /** H5页面 */
    H5("H5", "H5页面"),
    /** 其他小程序 */
    MINI_PROGRAM("MINI_PROGRAM", "其他小程序"),
    /** 无跳转 */
    NONE("NONE", "无跳转");

    /** 跳转类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    JumpTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static JumpTypeEnum getByCode(String code) {
        for (JumpTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
