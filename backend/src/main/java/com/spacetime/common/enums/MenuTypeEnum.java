package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 菜单类型枚举：M=目录 / C=菜单 / F=按钮
 */
@Getter
public enum MenuTypeEnum {
    /** 目录（侧边栏分组标题） */
    DIRECTORY("M", "目录"),
    /** 菜单（侧边栏链接项） */
    MENU("C", "菜单"),
    /** 按钮（权限控制点） */
    BUTTON("F", "按钮");

    /** 类型编码 */
    private final String code;
    /** 中文描述 */
    private final String desc;

    MenuTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
