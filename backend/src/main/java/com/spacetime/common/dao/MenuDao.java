package com.spacetime.common.dao;

import com.spacetime.common.entity.SysMenu;

import java.util.List;

/**
 * 菜单数据访问层接口
 */
public interface MenuDao {
    /** 按 ID 查询菜单 */
    SysMenu selectById(Long id);
    /** 查询全部启用菜单（按排序号升序） */
    List<SysMenu> selectAll();
    /** 批量按 ID 查询菜单 */
    List<SysMenu> selectByIds(List<Long> ids);
    /** 按角色 ID 列表查询菜单 */
    List<SysMenu> selectByRoleIds(List<Long> roleIds);
    /** 按单个角色 ID 查询菜单 */
    List<SysMenu> selectByRoleId(Long roleId);
    /** 查询角色拥有的菜单 ID 列表 */
    List<Long> selectMenuIdsByRoleId(Long roleId);
    /** 按角色 ID 列表查询权限标识 */
    List<String> selectPermsByRoleIds(List<Long> roleIds);
    /** 按用户 ID 查询权限标识 */
    List<String> selectPermsByUserId(Long userId);
    /** 按用户 ID 查询可展示的路由菜单（M/C 类型且 visible=1） */
    List<SysMenu> selectRoutersByUserId(Long userId);
    /** 插入菜单 */
    void insert(SysMenu menu);
    /** 按 ID 更新菜单 */
    void updateById(SysMenu menu);
    /** 按 ID 删除菜单 */
    void deleteById(Long id);
}
