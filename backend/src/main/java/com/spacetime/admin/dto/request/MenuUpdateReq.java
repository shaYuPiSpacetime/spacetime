package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

/**
 * 菜单更新请求体
 */
@Data
public class MenuUpdateReq {
    /** 菜单 ID（由 Controller 从 @PathVariable 注入） */
    private Long id;
    /** 父菜单 ID，顶级为 null */
    @PositiveOrZero(message = "父菜单ID不能为负数")
    private Long parentId;
    /** 菜单名称 */
    @NotBlank(message = "菜单名称不能为空")
    private String menuName;
    /** 菜单类型：M=目录 / C=菜单 / F=按钮 */
    @NotBlank(message = "菜单类型不能为空")
    @Pattern(regexp = "M|C|F", message = "菜单类型只能是M、C或F")
    private String menuType;
    /** 路由路径 */
    private String path;
    /** 前端组件路径 */
    private String component;
    /** 图标名称 */
    private String icon;
    /** 权限标识 */
    private String perms;
    /** 排序号 */
    private Integer menuSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    @Pattern(regexp = "ENABLED|DISABLED", message = "状态只能是ENABLED或DISABLED")
    private String status;
    /** 是否可见：0=隐藏 / 1=显示 */
    @Min(value = 0, message = "可见状态只能是0或1")
    @Max(value = 1, message = "可见状态只能是0或1")
    private Integer visible;
    /** 备注 */
    private String remark;
}
