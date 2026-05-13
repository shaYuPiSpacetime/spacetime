package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MenuCreateReq;
import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.service.impl.MenuServiceImpl;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.enums.MenuTypeEnum;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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
