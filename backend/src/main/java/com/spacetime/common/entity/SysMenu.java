package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * 系统菜单/权限实体
 * menuType: M=目录 / C=菜单 / F=按钮
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_menu")
public class SysMenu extends BaseEntity {
    /** 父菜单 ID，顶级为 null */
    private Long parentId;
    /** 菜单名称 */
    private String menuName;
    /** 菜单类型 @see MenuTypeEnum */
    private String menuType;
    /** 路由路径 */
    private String path;
    /** 前端组件路径 */
    private String component;
    /** 图标名称（Lucide 图标名） */
    private String icon;
    /** 权限标识，如 system:user:create */
    private String perms;
    /** 排序号 */
    private Integer menuSort;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 是否可见：0=隐藏 / 1=显示 */
    private Integer visible;
    /** 备注 */
    private String remark;

    /** 子菜单列表（非数据库字段） */
    @TableField(exist = false)
    private List<SysMenu> children;
}
