package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.entity.SysRoleMenu;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.SysUserRole;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.MenuTypeEnum;
import com.spacetime.common.mapper.SysMenuMapper;
import com.spacetime.common.mapper.SysRoleMenuMapper;
import com.spacetime.common.mapper.SysRoleMapper;
import com.spacetime.common.mapper.SysUserMapper;
import com.spacetime.common.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 菜单数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class MenuDaoImpl implements MenuDao {

    private final SysMenuMapper menuMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserMapper userMapper;

    @Override
    public SysMenu selectById(Long id) {
        return menuMapper.selectById(id);
    }

    @Override
    public List<SysMenu> selectAll() {
        return menuMapper.selectList(new LambdaQueryWrapper<SysMenu>()
                .orderByAsc(SysMenu::getMenuSort));
    }

    @Override
    public List<SysMenu> selectByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();
        List<SysMenu> menus = menuMapper.selectList(new LambdaQueryWrapper<SysMenu>()
                .in(SysMenu::getId, ids)
                .eq(SysMenu::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(SysMenu::getMenuSort));
        return menus.stream().filter(this::hasEnabledAncestors).toList();
    }

    @Override
    public List<SysMenu> selectByRoleIds(List<Long> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) return Collections.emptyList();
        List<SysRoleMenu> roleMenus = roleMenuMapper.selectList(
                new LambdaQueryWrapper<SysRoleMenu>().in(SysRoleMenu::getRoleId, roleIds));
        List<Long> menuIds = roleMenus.stream().map(SysRoleMenu::getMenuId).distinct().toList();
        if (menuIds.isEmpty()) return Collections.emptyList();
        return selectByIds(menuIds);
    }

    @Override
    public List<SysMenu> selectByRoleId(Long roleId) {
        return selectByRoleIds(List.of(roleId));
    }

    @Override
    public List<Long> selectMenuIdsByRoleId(Long roleId) {
        List<SysRoleMenu> roleMenus = roleMenuMapper.selectList(
                new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleId, roleId));
        return roleMenus.stream().map(SysRoleMenu::getMenuId).toList();
    }

    @Override
    public List<String> selectPermsByRoleIds(List<Long> roleIds) {
        List<SysMenu> menus = selectByRoleIds(roleIds);
        return menus.stream()
                .map(SysMenu::getPerms)
                .filter(p -> p != null && !p.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> selectPermsByUserId(Long userId) {
        List<Long> roleIds = selectEnabledRoleIdsByUserId(userId);
        if (roleIds.isEmpty()) return Collections.emptyList();
        return selectPermsByRoleIds(roleIds);
    }

    @Override
    public List<SysMenu> selectRoutersByUserId(Long userId) {
        List<Long> roleIds = selectEnabledRoleIdsByUserId(userId);
        if (roleIds.isEmpty()) return Collections.emptyList();
        List<SysMenu> menus = selectByRoleIds(roleIds);
        return menus.stream()
                .filter(m -> MenuTypeEnum.DIRECTORY.getCode().equals(m.getMenuType()) || MenuTypeEnum.MENU.getCode().equals(m.getMenuType()))
                .filter(m -> m.getVisible() != null && m.getVisible() == 1)
                .collect(Collectors.toList());
    }

    private List<Long> selectEnabledRoleIdsByUserId(Long userId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null || !CommonStatusEnum.ENABLED.getCode().equals(user.getStatus())) {
            return Collections.emptyList();
        }
        List<SysUserRole> userRoles = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));
        if (userRoles.isEmpty()) return Collections.emptyList();
        List<Long> roleIds = userRoles.stream().map(SysUserRole::getRoleId).distinct().toList();
        List<SysRole> roles = roleMapper.selectBatchIds(roleIds);
        return roles.stream()
                .filter(role -> CommonStatusEnum.ENABLED.getCode().equals(role.getStatus()))
                .map(SysRole::getId)
                .toList();
    }

    private boolean hasEnabledAncestors(SysMenu menu) {
        Set<Long> visited = new HashSet<>();
        Long parentId = menu.getParentId();
        while (parentId != null && parentId > 0) {
            if (!visited.add(parentId)) {
                return false;
            }
            SysMenu parent = menuMapper.selectById(parentId);
            if (parent == null || !CommonStatusEnum.ENABLED.getCode().equals(parent.getStatus())) {
                return false;
            }
            parentId = parent.getParentId();
        }
        return true;
    }

    @Override
    public void insert(SysMenu menu) {
        menuMapper.insert(menu);
    }

    @Override
    public void updateById(SysMenu menu) {
        menuMapper.updateById(menu);
    }

    @Override
    public void deleteById(Long id) {
        menuMapper.deleteById(id);
    }
}
