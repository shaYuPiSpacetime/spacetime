package com.spacetime.common.interceptor;

import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.dao.MenuDao;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PermissionInterceptor 权限校验")
class PermissionInterceptorTest {

    @Mock
    private MenuDao menuDao;

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("token 权限快照缺失但当前角色已有权限时放行")
    void shouldAllowWhenCurrentRolePermissionsContainRequiredPermission() throws Exception {
        PermissionInterceptor interceptor = new PermissionInterceptor(menuDao);
        UserContextHolder.set(new UserContext(1L, "peter", null, List.of("user:app:list")));
        when(menuDao.selectPermsByUserId(1L)).thenReturn(List.of("user:app:list", "access:config:list"));

        boolean allowed = interceptor.preHandle(
                new MockHttpServletRequest(),
                new MockHttpServletResponse(),
                new HandlerMethod(new DemoController(), DemoController.class.getDeclaredMethod("list"))
        );

        assertThat(allowed).isTrue();
        assertThat(UserContextHolder.get().getPermissions())
                .containsExactly("user:app:list", "access:config:list");
    }

    @Test
    @DisplayName("token 权限和当前角色权限都缺失时拒绝")
    void shouldDenyWhenPermissionMissingFromSnapshotAndCurrentRole() throws Exception {
        PermissionInterceptor interceptor = new PermissionInterceptor(menuDao);
        UserContextHolder.set(new UserContext(1L, "peter", null, List.of("user:app:list")));
        when(menuDao.selectPermsByUserId(1L)).thenReturn(List.of("user:app:list"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(
                new MockHttpServletRequest(),
                response,
                new HandlerMethod(new DemoController(), DemoController.class.getDeclaredMethod("list"))
        );

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("token 快照仍有权限但当前角色已撤销时拒绝")
    void shouldDenyWhenPermissionWasRevokedAfterLogin() throws Exception {
        PermissionInterceptor interceptor = new PermissionInterceptor(menuDao);
        UserContextHolder.set(new UserContext(1L, "peter", null, List.of("access:config:list")));
        when(menuDao.selectPermsByUserId(1L)).thenReturn(List.of("user:app:list"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(
                new MockHttpServletRequest(),
                response,
                new HandlerMethod(new DemoController(), DemoController.class.getDeclaredMethod("list"))
        );

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    private static class DemoController {
        @RequirePermission("access:config:list")
        void list() {
        }
    }
}
