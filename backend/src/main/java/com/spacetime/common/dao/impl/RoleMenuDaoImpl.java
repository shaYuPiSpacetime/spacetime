package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.entity.SysRoleMenu;
import com.spacetime.common.mapper.SysRoleMenuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 角色-菜单关联数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class RoleMenuDaoImpl implements RoleMenuDao {

    private final SysRoleMenuMapper roleMenuMapper;

    @Override
    public void deleteByRoleId(Long roleId) {
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenu>()
                .eq(SysRoleMenu::getRoleId, roleId));
    }

    @Override
    public void deleteByMenuId(Long menuId) {
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenu>()
                .eq(SysRoleMenu::getMenuId, menuId));
    }

    @Override
    public void batchInsert(List<SysRoleMenu> list) {
        if (list != null && !list.isEmpty()) {
            for (SysRoleMenu rm : list) {
                roleMenuMapper.insert(rm);
            }
        }
    }
}
