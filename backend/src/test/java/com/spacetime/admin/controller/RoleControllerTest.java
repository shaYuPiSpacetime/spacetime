package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.RoleDetailVO;
import com.spacetime.admin.dto.response.RoleVO;
import com.spacetime.admin.service.RoleService;
import com.spacetime.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoleController L2 测试")
class RoleControllerTest {

    @Mock
    private RoleService roleService;

    @InjectMocks
    private RoleController roleController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(roleController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-12 分页查询角色列表")
    void shouldReturnPaginatedRoles() throws Exception {
        Page<RoleVO> page = new Page<>(1, 10, 1);
        RoleVO vo = new RoleVO();
        vo.setId(1L);
        vo.setRoleName("超级管理员");
        vo.setRoleCode("super_admin");
        vo.setStatus("ENABLED");
        page.setRecords(List.of(vo));
        when(roleService.list(any())).thenReturn(page);

        mockMvc.perform(get("/admin/role/list?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.records[0].roleName").value("超级管理员"));
    }

    @Test
    @DisplayName("L2-13 查询全部角色")
    void shouldReturnAllRoles() throws Exception {
        RoleVO vo = new RoleVO();
        vo.setId(1L);
        vo.setRoleName("超级管理员");
        when(roleService.all()).thenReturn(List.of(vo));

        mockMvc.perform(get("/admin/role/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].roleName").value("超级管理员"));
    }

    @Test
    @DisplayName("L2-14 查询角色详情含菜单ID")
    void shouldReturnRoleDetail() throws Exception {
        RoleDetailVO detail = new RoleDetailVO();
        detail.setId(1L);
        detail.setRoleName("超级管理员");
        detail.setMenuIds(List.of(1L, 2L, 3L));
        when(roleService.detail(1L)).thenReturn(detail);

        mockMvc.perform(get("/admin/role/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.menuIds[0]").value(1));
    }

    @Test
    @DisplayName("L2-15 创建角色，返回新角色ID")
    void shouldCreateRole() throws Exception {
        when(roleService.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"测试角色\",\"roleCode\":\"test_role\",\"roleSort\":99}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("L2-16 更新角色")
    void shouldUpdateRole() throws Exception {
        doNothing().when(roleService).update(any());

        mockMvc.perform(put("/admin/role/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"已更新\",\"roleCode\":\"test_role\",\"roleSort\":99,\"status\":\"ENABLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-17 删除角色")
    void shouldDeleteRole() throws Exception {
        doNothing().when(roleService).delete(1L);

        mockMvc.perform(delete("/admin/role/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-18 角色绑定菜单")
    void shouldBindMenus() throws Exception {
        doNothing().when(roleService).bindMenus(any());

        mockMvc.perform(put("/admin/role/1/menus")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"menuIds\":[1,2,3]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
