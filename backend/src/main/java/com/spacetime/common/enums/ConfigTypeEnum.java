package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 配置类型枚举
 */
@Getter
public enum ConfigTypeEnum {
    /** 文本 */
    TEXT("TEXT", "文本"),
    /** 链接 */
    URL("URL", "链接"),
    /** JSON */
    JSON("JSON", "JSON"),
    /** 数字 */
    NUMBER("NUMBER", "数字"),
    /** 布尔 */
    BOOLEAN("BOOLEAN", "布尔");

    /** 类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    ConfigTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static ConfigTypeEnum getByCode(String code) {
        for (ConfigTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
