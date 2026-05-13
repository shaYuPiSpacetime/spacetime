package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 角色-菜单关联实体
 */
@Data
@TableName("sys_role_menu")
public class SysRoleMenu {
    /** 主键 */
    private Long id;
    /** 角色 ID */
    private Long roleId;
    /** 菜单 ID */
    private Long menuId;
}
