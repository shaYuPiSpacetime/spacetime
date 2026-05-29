package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 匹配类型枚举
 */
@Getter
public enum MatchTypeEnum {
    /** 精确匹配 */
    EXACT("EXACT", "精确匹配"),
    /** 包含匹配 */
    FUZZY("FUZZY", "包含匹配"),
    /** 前缀匹配 */
    PREFIX("PREFIX", "前缀匹配");

    /** 匹配类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    MatchTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static MatchTypeEnum getByCode(String code) {
        for (MatchTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
