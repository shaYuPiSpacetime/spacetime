package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 移动端入口配置新增/编辑请求
 */
@Data
public class MobileEntryConfigSaveReq {
    /** 页面编码 */
    @NotBlank(message = "页面编码不能为空")
    private String pageCode;
    /** 入口稳定业务键 */
    @NotBlank(message = "入口键不能为空")
    private String entryKey;
    /** 入口展示名称 */
    @NotBlank(message = "入口名称不能为空")
    private String entryName;
    /** 入口图标标识 */
    private String icon;
    /** 跳转类型 */
    @NotBlank(message = "跳转类型不能为空")
    private String jumpType;
    /** 跳转目标 */
    private String jumpTarget;
    /** 角标文案 */
    private String badgeText;
    /** 角标类型 */
    private String badgeType;
    /** 是否需要登录：0=否，1=是 */
    @NotNull(message = "loginRequired 不能为空")
    private Integer loginRequired;
    /** 排序号 */
    private Integer sort;
    /** 状态 */
    @NotBlank(message = "状态不能为空")
    private String status;
    /** 扩展 JSON */
    private String extraJson;
}
