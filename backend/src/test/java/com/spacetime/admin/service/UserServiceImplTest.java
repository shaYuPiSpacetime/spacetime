package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.UserDetailVO;
import com.spacetime.admin.service.impl.UserServiceImpl;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.SysUserRole;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserServiceImpl L3 测试")
class UserServiceImplTest {

    @Mock
    private UserDao userDao;
    @Mock
    private UserRoleDao userRoleDao;
    @Mock
    private RoleDao roleDao;

    @InjectMocks
    private UserServiceImpl userService;

    private static final String BCrypt_HASH = "$2a$10$YXv7Pv6eKNlm7dUOMSWLaOUjkwhikg50Vx053I514TJEpJqJ5odpa";

    @BeforeEach
    void setUp() {
        // No common setup needed beyond mocks
    }

    @Test
    @DisplayName("L3-05 创建用户：用户名已存在 → BusinessException")
    void shouldThrowWhenUsernameExists() {
        SysUser exist = new SysUser();
        exist.setId(1L);
        exist.setUsername("peter");
        when(userDao.selectByUsername("peter")).thenReturn(exist);

        UserCreateReq req = new UserCreateReq();
        req.setUsername("peter");
        req.setPassword("Test123");
        req.setNickname("测试");

        assertThatThrownBy(() -> userService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("用户名已存在");
        verify(userDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-06 创建用户成功：密码被 BCrypt 加密")
    void shouldCreateUserWithEncryptedPassword() {
        when(userDao.selectByUsername("newuser")).thenReturn(null);
        doAnswer(inv -> {
            SysUser u = inv.getArgument(0);
            assertThat(u.getPassword()).startsWith("$2a$");
            assertThat(u.getNickname()).isEqualTo("新用户");
            assertThat(u.getStatus()).isEqualTo(CommonStatusEnum.ENABLED.getCode());
            return null;
        }).when(userDao).insert(any());

        UserCreateReq req = new UserCreateReq();
        req.setUsername("newuser");
        req.setPassword("Test123");
        req.setNickname("新用户");
        req.setStatus(CommonStatusEnum.ENABLED.getCode());

        userService.create(req);
        verify(userDao).insert(any());
    }

    @Test
    @DisplayName("L3-07 更新用户：用户不存在 → BusinessException")
    void shouldThrowWhenUpdatingNonexistentUser() {
        when(userDao.selectById(999L)).thenReturn(null);

        UserUpdateReq req = new UserUpdateReq();
        req.setId(999L);
        req.setNickname("测试");

        assertThatThrownBy(() -> userService.update(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("用户不存在");
    }

    @Test
    @DisplayName("L3-08 查询用户详情：含角色 ID 列表")
    void shouldReturnUserDetailWithRoleIds() {
        SysUser user = new SysUser();
        user.setId(1L);
        user.setUsername("peter");
        user.setNickname("peter");
        user.setStatus(CommonStatusEnum.ENABLED.getCode());
        when(userDao.selectById(1L)).thenReturn(user);

        SysUserRole ur = new SysUserRole();
        ur.setUserId(1L);
        ur.setRoleId(1L);
        when(userRoleDao.selectByUserId(1L)).thenReturn(List.of(ur));

        UserDetailVO detail = userService.detail(1L);

        assertThat(detail.getUsername()).isEqualTo("peter");
        assertThat(detail.getRoleIds()).containsExactly(1L);
    }

    @Test
    @DisplayName("L3-09 分配角色：先清除旧关联再插入新关联")
    void shouldClearOldRolesThenInsertNewOnes() {
        UserRoleReq req = new UserRoleReq();
        req.setUserId(1L);
        req.setRoleIds(List.of(1L, 2L));

        userService.assignRoles(req);

        verify(userRoleDao).deleteByUserId(1L);
        verify(userRoleDao).batchInsert(anyList());
    }

    @Test
    @DisplayName("L3-10 重置密码：用户不存在 → BusinessException")
    void shouldThrowWhenResettingPasswordForNonexistentUser() {
        when(userDao.selectById(999L)).thenReturn(null);

        ResetPwdReq req = new ResetPwdReq();
        req.setUserId(999L);
        req.setNewPassword("NewPass");

        assertThatThrownBy(() -> userService.resetPassword(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("用户不存在");
    }
}
