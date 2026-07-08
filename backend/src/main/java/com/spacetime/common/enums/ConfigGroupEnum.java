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
    /** 社区与互动 */
    COMMUNITY("COMMUNITY", "社区与互动"),
    /** 我的页 */
    MY_PAGE("MY_PAGE", "我的页"),
    /** 设置页 */
    SETTINGS_PAGE("SETTINGS_PAGE", "设置页"),
    /** 安全中心 */
    SECURITY_CENTER("SECURITY_CENTER", "安全中心"),
    /** PRD01 准入配置 */
    PRD01_ACCESS("PRD01_ACCESS", "PRD01 准入配置"),
    /** PRD01 资料字段配置 */
    PRD01_PROFILE_FIELD("PRD01_PROFILE_FIELD", "PRD01 资料字段配置"),
    /** PRD01 上传配置 */
    PRD01_UPLOAD("PRD01_UPLOAD", "PRD01 上传配置"),
    /** PRD01 审核配置 */
    PRD01_AUDIT("PRD01_AUDIT", "PRD01 审核配置");

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
