package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 移动端入口配置视图对象
 */
@Data
public class MobileEntryConfigVO {
    /** 主键 ID */
    private Long id;
    /** 页面编码 */
    private String pageCode;
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
    /** 状态 */
    private String status;
    /** 扩展 JSON */
    private String extraJson;
    /** 创建时间 */
    private String createTime;
}
