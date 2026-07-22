package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MenuCreateReq;
import com.spacetime.admin.dto.request.MenuUpdateReq;
import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.service.impl.MenuServiceImpl;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.enums.MenuTypeEnum;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuServiceImpl L3 测试")
class MenuServiceImplTest {

    @Mock
    private MenuDao menuDao;
    @Mock
    private RoleMenuDao roleMenuDao;

    @InjectMocks
    private MenuServiceImpl menuService;

    @Test
    @DisplayName("L3-15 创建菜单")
    void shouldCreateMenu() {
        MenuCreateReq req = new MenuCreateReq();
        req.setMenuName("测试菜单");
        req.setMenuType(MenuTypeEnum.DIRECTORY.getCode());
        req.setPath("/test");
        req.setMenuSort(99);

        menuService.create(req);
        verify(menuDao).insert(any());
    }

    @Test
    @DisplayName("L3-22 创建子菜单时拒绝不存在的父菜单")
    void shouldRejectMissingParentOnCreate() {
        MenuCreateReq req = new MenuCreateReq();
        req.setParentId(99L);
        req.setMenuName("测试菜单");
        req.setMenuType(MenuTypeEnum.MENU.getCode());
        when(menuDao.selectById(99L)).thenReturn(null);

        assertThatThrownBy(() -> menuService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("上级菜单不存在");
        verify(menuDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-24 页面菜单下不能继续创建目录或页面菜单")
    void shouldRejectPageMenuAsParentOfRoutableMenu() {
        SysMenu root = buildMenu(1L, 0L, "系统管理", "M");
        SysMenu page = buildMenu(2L, 1L, "用户管理", "C");
        when(menuDao.selectById(2L)).thenReturn(page);
        when(menuDao.selectById(1L)).thenReturn(root);
        MenuCreateReq req = new MenuCreateReq();
        req.setParentId(2L);
        req.setMenuName("错误子页面");
        req.setMenuType(MenuTypeEnum.MENU.getCode());

        assertThatThrownBy(() -> menuService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只能挂在目录下");
        verify(menuDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-23 更新菜单时拒绝把自身或子孙设为父级")
    void shouldRejectSelfOrDescendantParentOnUpdate() {
        SysMenu root = buildMenu(1L, 0L, "根菜单", "M");
        SysMenu child = buildMenu(2L, 1L, "子菜单", "C");
        when(menuDao.selectById(1L)).thenReturn(root);
        when(menuDao.selectById(2L)).thenReturn(child);

        MenuUpdateReq selfReq = buildUpdateReq(1L, 1L);
        assertThatThrownBy(() -> menuService.update(selfReq))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("自身或子菜单");

        MenuUpdateReq childReq = buildUpdateReq(1L, 2L);
        assertThatThrownBy(() -> menuService.update(childReq))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("自身或子菜单");
        verify(menuDao, never()).updateById(any());
    }

    @Test
    @DisplayName("L3-25 更新菜单时 parentId=0 可移动到顶级")
    void shouldMoveMenuToRoot() {
        SysMenu child = buildMenu(2L, 1L, "用户管理", "C");
        when(menuDao.selectById(2L)).thenReturn(child);

        menuService.update(buildUpdateReq(2L, 0L));

        ArgumentCaptor<SysMenu> captor = ArgumentCaptor.forClass(SysMenu.class);
        verify(menuDao).updateById(captor.capture());
        assertThat(captor.getValue().getParentId()).isEqualTo(0L);
    }

    @Test
    @DisplayName("L3-16 菜单树查询：目录包裹子菜单")
    void shouldBuildMenuTree() {
        SysMenu dir = buildMenu(1L, 0L, "系统管理", "M");
        SysMenu page = buildMenu(2L, 1L, "用户管理", "C");
        when(menuDao.selectAll()).thenReturn(List.of(dir, page));

        List<MenuVO> tree = menuService.tree();

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).getMenuName()).isEqualTo("系统管理");
        assertThat(tree.get(0).getChildren()).hasSize(1);
        assertThat(tree.get(0).getChildren().get(0).getMenuName()).isEqualTo("用户管理");
    }

    @Test
    @DisplayName("L3-17 删除菜单：收集子孙ID并级联删除")
    void shouldCascadeDeleteChildren() {
        SysMenu root = buildMenu(1L, 0L, "系统管理", "M");
        SysMenu child1 = buildMenu(2L, 1L, "子菜单1", "C");
        when(menuDao.selectById(1L)).thenReturn(root);
        when(menuDao.selectAll()).thenReturn(List.of(root, child1));

        menuService.delete(1L);

        // root + direct child both deleted
        verify(menuDao).deleteById(1L);
        verify(menuDao).deleteById(2L);
        verify(roleMenuDao).deleteByMenuId(1L);
        verify(roleMenuDao).deleteByMenuId(2L);
    }

    private MenuUpdateReq buildUpdateReq(Long id, Long parentId) {
        MenuUpdateReq req = new MenuUpdateReq();
        req.setId(id);
        req.setParentId(parentId);
        req.setMenuName("更新菜单");
        req.setMenuType(MenuTypeEnum.MENU.getCode());
        req.setMenuSort(1);
        req.setStatus("ENABLED");
        req.setVisible(1);
        return req;
    }

    private SysMenu buildMenu(Long id, Long parentId, String name, String type) {
        SysMenu m = new SysMenu();
        m.setId(id);
        m.setParentId(parentId);
        m.setMenuName(name);
        m.setMenuType(type);
        m.setMenuSort(1);
        m.setVisible(1);
        m.setStatus("ENABLED");
        return m;
    }
}
