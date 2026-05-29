package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 搜索屏蔽类型枚举
 */
@Getter
public enum SearchBlockTypeEnum {
    /** 搜索词违规 */
    SEARCH_VIOLATION("SEARCH_VIOLATION", "搜索词违规"),
    /** 搜索结果屏蔽 */
    RESULT_BLOCK("RESULT_BLOCK", "搜索结果屏蔽");

    /** 屏蔽类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    SearchBlockTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static SearchBlockTypeEnum getByCode(String code) {
        for (SearchBlockTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
