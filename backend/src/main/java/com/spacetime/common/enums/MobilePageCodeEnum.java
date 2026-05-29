package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 移动端页面编码枚举
 */
@Getter
public enum MobilePageCodeEnum {
    /** 我的页 */
    MY_PAGE("MY_PAGE", "我的页"),
    /** 设置页 */
    SETTINGS_PAGE("SETTINGS_PAGE", "设置页"),
    /** 安全中心 */
    SECURITY_CENTER("SECURITY_CENTER", "安全中心"),
    /** 搜索结果Tab */
    SEARCH_RESULT_TAB("SEARCH_RESULT_TAB", "搜索结果Tab");

    /** 页面编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    MobilePageCodeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static MobilePageCodeEnum getByCode(String code) {
        for (MobilePageCodeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}
