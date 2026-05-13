package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.RoleCreateReq;
import com.spacetime.admin.dto.request.RoleMenuReq;
import com.spacetime.admin.service.impl.RoleServiceImpl;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoleServiceImpl L3 测试")
class RoleServiceImplTest {

    @Mock
    private RoleDao roleDao;
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
        roleService.delete(1L);

        verify(roleDao).deleteById(1L);
        verify(roleMenuDao).deleteByRoleId(1L);
        verify(userRoleDao).deleteByRoleId(1L);
    }

    @Test
    @DisplayName("L3-14 绑定菜单：先清除旧关联再插入新关联")
    void shouldClearOldMenusThenInsertNewOnes() {
        RoleMenuReq req = new RoleMenuReq();
        req.setRoleId(1L);
        req.setMenuIds(java.util.List.of(1L, 2L, 3L));

        roleService.bindMenus(req);

        verify(roleMenuDao).deleteByRoleId(1L);
        verify(roleMenuDao).batchInsert(anyList());
    }

    private RoleCreateReq buildCreateReq(String name, String code) {
        RoleCreateReq req = new RoleCreateReq();
        req.setRoleName(name);
        req.setRoleCode(code);
        req.setRoleSort(1);
        return req;
    }
}
