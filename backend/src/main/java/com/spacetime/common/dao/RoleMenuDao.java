package com.spacetime.common.dao;

import com.spacetime.common.entity.SysRoleMenu;

import java.util.List;

/**
 * 角色-菜单关联数据访问层接口
 */
public interface RoleMenuDao {
    /** 按角色 ID 删除所有关联 */
    void deleteByRoleId(Long roleId);
    /** 按菜单 ID 删除所有关联 */
    void deleteByMenuId(Long menuId);
    /** 批量插入关联 */
    void batchInsert(List<SysRoleMenu> list);
}
