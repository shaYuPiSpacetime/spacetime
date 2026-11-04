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

import java.util.ArrayList;
import java.util.List;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;
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
        when(roleMenuMapper.selectList(any())).thenReturn(List.of(roleMenu));
        // 批量查询仅返回启用菜单，禁用父级不会出现在结果中。
        when(menuMapper.selectList(any())).thenReturn(List.of(child));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByRoleIds(List.of(1L))).isEmpty();
        verify(menuMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("无菜单授权时不查询菜单表")
    void shouldSkipQueryForEmptyMenuIds() {
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(null)).isEmpty();
        assertThat(menuDao.selectByIds(List.of())).isEmpty();

        verifyNoInteractions(menuMapper);
    }

    @Test
    @DisplayName("多个按钮共享父级时只查询一次菜单且不额外授予父级权限")
    void shouldCheckSharedAncestorsWithOneQuery() {
        List<SysMenu> enabledMenus = new ArrayList<>();
        enabledMenus.add(menu(1L, 0L));
        enabledMenus.add(menu(2L, 1L));
        List<Long> buttonIds = LongStream.rangeClosed(3, 102).boxed().toList();
        buttonIds.forEach(id -> enabledMenus.add(menu(id, 2L)));
        when(menuMapper.selectList(any())).thenReturn(enabledMenus);
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(buttonIds)).extracting(SysMenu::getId).containsExactlyElementsOf(buttonIds);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<SysMenu>> wrapperCaptor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(menuMapper).selectList(wrapperCaptor.capture());
        LambdaQueryWrapper<SysMenu> wrapper = wrapperCaptor.getValue();
        assertThat(wrapper.getCustomSqlSegment().toLowerCase())
                .contains("status =", "order by menu_sort asc").doesNotContain(" in ");
        assertThat(wrapper.getParamNameValuePairs()).containsValue("ENABLED");
        verify(menuMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("保留数据库菜单顺序并忽略重复和不存在的授权编号")
    void shouldPreserveMenuOrderAndExcludeUnassignedMenus() {
        SysMenu first = menu(2L, 0L);
        SysMenu second = menu(1L, null);
        when(menuMapper.selectList(any())).thenReturn(List.of(first, second, menu(3L, 0L)));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(List.of(1L, 2L, 1L, 99L))).containsExactly(first, second);
    }

    @Test
    @DisplayName("父级缺失或已删除时拒绝子级权限且保留独立菜单")
    void shouldExcludeMenusWithMissingAncestors() {
        SysMenu root = menu(1L, 0L);
        SysMenu child = menu(2L, 99L);
        when(menuMapper.selectList(any())).thenReturn(List.of(root, child));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(List.of(1L, 2L))).containsExactly(root);
        verify(menuMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("自引用和循环父级不授予权限且不影响正常菜单")
    void shouldRejectCyclicAncestors() {
        SysMenu root = menu(1L, 0L);
        when(menuMapper.selectList(any())).thenReturn(List.of(root,
                menu(2L, 2L), menu(3L, 4L), menu(4L, 3L), menu(5L, 3L)));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(List.of(1L, 2L, 3L, 4L, 5L))).containsExactly(root);
        verify(menuMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("菜单父级禁用后下一次请求立即撤销子级权限")
    void shouldRefreshAncestorsOnEveryCall() {
        SysMenu parent = menu(1L, 0L);
        SysMenu child = menu(2L, 1L);
        when(menuMapper.selectList(any())).thenReturn(List.of(parent, child), List.of(child));
        MenuDaoImpl menuDao = new MenuDaoImpl(menuMapper, roleMenuMapper, userRoleMapper, roleMapper, userMapper);

        assertThat(menuDao.selectByIds(List.of(2L))).containsExactly(child);
        assertThat(menuDao.selectByIds(List.of(2L))).isEmpty();
        verify(menuMapper, times(2)).selectList(any());
        verify(menuMapper, never()).selectById(any());
    }

    private SysMenu menu(Long id, Long parentId) {
        SysMenu menu = new SysMenu();
        menu.setId(id);
        menu.setParentId(parentId);
        menu.setStatus("ENABLED");
        return menu;
    }
}
