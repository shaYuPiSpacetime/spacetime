package com.spacetime.admin.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RoleCreateReq;
import com.spacetime.admin.dto.request.RoleMenuReq;
import com.spacetime.admin.dto.request.RolePageReq;
import com.spacetime.admin.service.impl.RoleServiceImpl;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.exception.BusinessException;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoleServiceImpl L3 测试")
class RoleServiceImplTest {

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), SysRole.class);
    }

    @Mock
    private RoleDao roleDao;
    @Mock
    private MenuDao menuDao;
    @Mock
    private RoleMenuDao roleMenuDao;
    @Mock
    private UserRoleDao userRoleDao;

    @InjectMocks
    private RoleServiceImpl roleService;

    @Test
    @DisplayName("L3-11 创建角色：角色编码已存在 → BusinessException")
    void shouldThrowWhenRoleCodeExists() {
        SysRole exist = new SysRole();
        exist.setId(1L);
        exist.setRoleCode("super_admin");
        when(roleDao.selectByCode("super_admin")).thenReturn(exist);

        RoleCreateReq req = new RoleCreateReq();
        req.setRoleName("测试");
        req.setRoleCode("super_admin");
        req.setRoleSort(1);

        assertThatThrownBy(() -> roleService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("角色编码已存在");
        verify(roleDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-12 创建角色成功")
    void shouldCreateRole() {
        when(roleDao.selectByCode("new_role")).thenReturn(null);
        roleService.create(buildCreateReq("测试角色", "new_role"));

        verify(roleDao).insert(any());
    }

    @Test
    @DisplayName("L3-13 删除角色：清除关联数据（role_menu + user_role）")
    void shouldCleanAssociationsOnDelete() {
        SysRole role = new SysRole();
        role.setId(1L);
        role.setRoleCode("operator");
        when(roleDao.selectById(1L)).thenReturn(role);
        roleService.delete(1L);

        verify(roleDao).deleteById(1L);
        verify(roleMenuDao).deleteByRoleId(1L);
        verify(userRoleDao).deleteByRoleId(1L);
    }

    @Test
    @DisplayName("L3-22 不允许删除超级管理员角色")
    void shouldRejectDeletingSuperAdminRole() {
        SysRole role = new SysRole();
        role.setId(1L);
        role.setRoleCode("super_admin");
        when(roleDao.selectById(1L)).thenReturn(role);

        assertThatThrownBy(() -> roleService.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("超级管理员角色");
        verify(roleDao, never()).deleteById(any());
    }

    @Test
    @DisplayName("L3-14 绑定菜单：先清除旧关联再插入新关联")
    void shouldClearOldMenusThenInsertNewOnes() {
        SysRole role = new SysRole();
        role.setId(1L);
        lenient().when(roleDao.selectById(1L)).thenReturn(role);
        lenient().when(menuDao.selectById(1L)).thenReturn(buildMenu(1L, 0L));
        lenient().when(menuDao.selectById(2L)).thenReturn(buildMenu(2L, 0L));
        lenient().when(menuDao.selectById(3L)).thenReturn(buildMenu(3L, 0L));
        RoleMenuReq req = new RoleMenuReq();
        req.setRoleId(1L);
        req.setMenuIds(java.util.List.of(1L, 2L, 3L));

        roleService.bindMenus(req);

        verify(roleMenuDao).deleteByRoleId(1L);
        verify(roleMenuDao).batchInsert(anyList());
    }

    @Test
    @DisplayName("L3-20 角色关键词应同时搜索名称和编码")
    void shouldSearchRoleNameOrCode() {
        Page<SysRole> emptyPage = new Page<>(1, 20, 0);
        emptyPage.setRecords(java.util.List.of());
        when(roleDao.selectPage(any(), any())).thenReturn(emptyPage);

        RolePageReq req = new RolePageReq();
        req.setKeyword("admin");
        roleService.list(req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<SysRole>> wrapperCaptor =
                ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(roleDao).selectPage(any(), wrapperCaptor.capture());
        assertThat(wrapperCaptor.getValue().getCustomSqlSegment().toLowerCase())
                .contains("role_name")
                .contains("role_code");
    }

    @Test
    @DisplayName("L3-21 绑定叶子菜单时自动补齐祖先目录")
    void shouldIncludeAncestorMenusWhenBindingChild() {
        SysRole role = new SysRole();
        role.setId(1L);
        lenient().when(roleDao.selectById(1L)).thenReturn(role);
        lenient().when(menuDao.selectById(3L)).thenReturn(buildMenu(3L, 2L));
        lenient().when(menuDao.selectById(2L)).thenReturn(buildMenu(2L, 1L));
        lenient().when(menuDao.selectById(1L)).thenReturn(buildMenu(1L, 0L));

        RoleMenuReq req = new RoleMenuReq();
        req.setRoleId(1L);
        req.setMenuIds(java.util.List.of(3L));
        roleService.bindMenus(req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.List<com.spacetime.common.entity.SysRoleMenu>> captor =
                ArgumentCaptor.forClass(java.util.List.class);
        verify(roleMenuDao).batchInsert(captor.capture());
        assertThat(captor.getValue())
                .extracting(com.spacetime.common.entity.SysRoleMenu::getMenuId)
                .containsExactlyInAnyOrder(1L, 2L, 3L);
    }

    private RoleCreateReq buildCreateReq(String name, String code) {
        RoleCreateReq req = new RoleCreateReq();
        req.setRoleName(name);
        req.setRoleCode(code);
        req.setRoleSort(1);
        return req;
    }

    private SysMenu buildMenu(Long id, Long parentId) {
        SysMenu menu = new SysMenu();
        menu.setId(id);
        menu.setParentId(parentId);
        menu.setStatus("ENABLED");
        return menu;
    }
}
