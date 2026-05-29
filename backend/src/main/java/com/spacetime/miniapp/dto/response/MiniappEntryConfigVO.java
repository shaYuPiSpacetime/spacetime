package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 小程序移动端入口配置视图对象
 */
@Data
public class MiniappEntryConfigVO {
    /** 入口稳定业务键 */
    private String entryKey;
    /** 入口展示名称 */
    private String entryName;
    /** 入口图标标识 */
    private String icon;
    /** 跳转类型 */
    private String jumpType;
    /** 跳转目标 */
    private String jumpTarget;
    /** 角标文案 */
    private String badgeText;
    /** 角标类型 */
    private String badgeType;
    /** 是否需要登录：0=否，1=是 */
    private Integer loginRequired;
    /** 排序号 */
    private Integer sort;
}
