package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.MenuDaoImpl;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.entity.SysRoleMenu;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.SysUserRole;
import com.spacetime.common.mapper.SysMenuMapper;
import com.spacetime.common.mapper.SysRoleMenuMapper;
import com.spacetime.common.mapper.SysRoleMapper;
import com.spacetime.common.mapper.SysUserMapper;
import com.spacetime.common.mapper.SysUserRoleMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuDaoImpl L3 测试")
class MenuDaoImplTest {

    @Mock
    private SysMenuMapper menuMapper;
    @Mock
    private SysRoleMenuMapper roleMenuMapper;
    @Mock
    private SysUserRoleMapper userRoleMapper;
    @Mock
    private SysRoleMapper roleMapper;
    @Mock
    private SysUserMapper userMapper;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), SysMenu.class);
    }

    @Test
    @DisplayName("L3-24 后台菜单列表应包含禁用菜单")
    void shouldSelectMenusRegardlessOfStatusForManagement() {
        when(menuMapper.selectList(any())).thenReturn(List.of());
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        menuDao.selectAll();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<SysMenu>> wrapperCaptor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(menuMapper).selectList(wrapperCaptor.capture());
        assertThat(wrapperCaptor.getValue().getCustomSqlSegment().toLowerCase()).doesNotContain("status");
    }

    @Test
    @DisplayName("L3-25 禁用用户不应继续获得权限")
    void shouldReturnNoPermissionsForDisabledUser() {
        SysUser user = new SysUser();
        user.setId(1L);
        user.setStatus("DISABLED");
        when(userMapper.selectById(1L)).thenReturn(user);
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectPermsByUserId(1L)).isEmpty();

        verify(userRoleMapper, never()).selectList(any());
    }

    @Test
    @DisplayName("L3-26 禁用角色不应继续向用户授予权限")
    void shouldIgnoreDisabledRolesForUserPermissions() {
        SysUser user = new SysUser();
        user.setId(1L);
        user.setStatus("ENABLED");
        SysUserRole userRole = new SysUserRole();
        userRole.setUserId(1L);
        userRole.setRoleId(2L);
        SysRole role = new SysRole();
        role.setId(2L);
        role.setStatus("DISABLED");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(userRoleMapper.selectList(any())).thenReturn(List.of(userRole));
        when(roleMapper.selectBatchIds(any())).thenReturn(List.of(role));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectPermsByUserId(1L)).isEmpty();

        verify(roleMenuMapper, never()).selectList(any());
    }

    @Test
    @DisplayName("L3-27 禁用父菜单后子菜单和按钮权限应同时失效")
    void shouldIgnoreMenuWhenAncestorIsDisabled() {
        SysRoleMenu roleMenu = new SysRoleMenu();
        roleMenu.setRoleId(1L);
        roleMenu.setMenuId(2L);
        SysMenu child = new SysMenu();
        child.setId(2L);
        child.setParentId(1L);
        child.setStatus("ENABLED");
        SysMenu parent = new SysMenu();
        parent.setId(1L);
        parent.setParentId(0L);
        parent.setStatus("DISABLED");
        when(roleMenuMapper.selectList(any())).thenReturn(List.of(roleMenu));
        when(menuMapper.selectList(any())).thenReturn(List.of(child));
        when(menuMapper.selectById(1L)).thenReturn(parent);
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByRoleIds(List.of(1L))).isEmpty();
    }
}
