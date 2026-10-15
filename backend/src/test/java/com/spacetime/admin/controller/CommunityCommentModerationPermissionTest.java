package com.spacetime.admin.controller;

import com.spacetime.admin.service.CommunityAdminService;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.interceptor.PermissionInterceptor;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 评论两条审核路由使用真实权限拦截器验证权限，业务数据全部隔离。 */
class CommunityCommentModerationPermissionTest {

    @AfterEach
    void clearSyntheticContext() {
        UserContextHolder.clear();
    }

    @ParameterizedTest
    @CsvSource({"false,false", "false,true", "true,false", "true,true"})
    void commentModerationRoutes_shouldRequireTheirOwnCurrentRolePermission(boolean legacy, boolean granted) throws Exception {
        CommunityAdminService service = mock(CommunityAdminService.class);
        MenuDao menuDao = mock(MenuDao.class);
        String permission = legacy ? "community:comment:audit" : "community:comment:manage";
        // token 快照声称有权限也不能绕过当前角色已撤销的权限。
        UserContextHolder.set(new UserContext(900001L, "synthetic-admin", null, List.of(permission)));
        when(menuDao.selectPermsByUserId(900001L)).thenReturn(granted ? List.of(permission) : List.of());
        var mvc = MockMvcBuilders.standaloneSetup(new CommunityAdminController(service))
                .addInterceptors(new PermissionInterceptor(menuDao)).build();
        mvc.perform(put("/admin/community/comments/201/" + (legacy ? "audit" : "status"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(legacy ? "{\"auditStatus\":\"APPROVED\",\"auditRemark\":\"synthetic\"}"
                                : "{\"action\":\"approve\",\"version\":0,\"reason\":\"synthetic\"}"))
                .andExpect(granted ? status().isOk() : status().isForbidden());

        if (!granted) verifyNoInteractions(service);
        else if (legacy) verify(service).auditComment(eq(201L), any());
        else verify(service).updateCommentStatus(eq(201L), any());
    }
}
