package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 配置分组枚举
 */
@Getter
public enum ConfigGroupEnum {
    /** 默认 */
    DEFAULT("DEFAULT", "默认"),
    /** 协议 */
    AGREEMENT("AGREEMENT", "协议"),
    /** 关于 */
    ABOUT("ABOUT", "关于"),
    /** 搜索 */
    SEARCH("SEARCH", "搜索"),
    /** 我的页 */
    MY_PAGE("MY_PAGE", "我的页"),
    /** 设置页 */
    SETTINGS_PAGE("SETTINGS_PAGE", "设置页"),
    /** 安全中心 */
    SECURITY_CENTER("SECURITY_CENTER", "安全中心");

    /** 分组编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    ConfigGroupEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static ConfigGroupEnum getByCode(String code) {
        for (ConfigGroupEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
