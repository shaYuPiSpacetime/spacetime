package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 内容类型枚举：H5 链接 / 原生内容
 */
@Getter
public enum ContentTypeEnum {
    /** H5链接 */
    H5("H5", "H5链接"),
    /** 原生内容 */
    NATIVE("NATIVE", "原生内容");

    /** 类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    ContentTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static ContentTypeEnum getByCode(String code) {
        for (ContentTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
