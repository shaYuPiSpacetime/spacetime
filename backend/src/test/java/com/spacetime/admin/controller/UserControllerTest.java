package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.UserDetailVO;
import com.spacetime.admin.dto.response.UserVO;
import com.spacetime.admin.service.UserService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController L2 测试")
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-04 分页查询用户列表")
    void shouldReturnPaginatedUsers() throws Exception {
        Page<UserVO> page = new Page<>(1, 10, 1);
        UserVO vo = new UserVO();
        vo.setId(1L);
        vo.setUsername("peter");
        vo.setNickname("peter");
        vo.setStatus("ENABLED");
        vo.setCreateTime(LocalDateTime.now());
        page.setRecords(List.of(vo));
        when(userService.list(any())).thenReturn(page);

        mockMvc.perform(get("/admin/user/list?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].username").value("peter"));
    }

    @Test
    @DisplayName("L2-05 查询用户详情")
    void shouldReturnUserDetail() throws Exception {
        UserDetailVO detail = new UserDetailVO();
        detail.setId(1L);
        detail.setUsername("peter");
        detail.setNickname("peter");
        detail.setStatus("ENABLED");
        detail.setRoleIds(List.of(1L));
        when(userService.detail(1L)).thenReturn(detail);

        mockMvc.perform(get("/admin/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("peter"))
                .andExpect(jsonPath("$.data.roleIds[0]").value(1));
    }

    @Test
    @DisplayName("L2-06 创建用户，返回新用户ID")
    void shouldCreateUser() throws Exception {
        when(userService.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"newuser\",\"password\":\"Pass123\",\"nickname\":\"新用户\",\"status\":\"ENABLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("L2-07 创建用户缺少密码触发校验 → code=4001")
    void shouldFailWhenPasswordMissing() throws Exception {
        mockMvc.perform(post("/admin/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"newuser\",\"nickname\":\"新用户\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001));
    }

    @Test
    @DisplayName("L2-08 更新用户")
    void shouldUpdateUser() throws Exception {
        doNothing().when(userService).update(any());

        mockMvc.perform(put("/admin/user/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"已更新\",\"status\":\"ENABLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-09 删除用户")
    void shouldDeleteUser() throws Exception {
        doNothing().when(userService).delete(1L);

        mockMvc.perform(delete("/admin/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-10 重置密码")
    void shouldResetPassword() throws Exception {
        doNothing().when(userService).resetPassword(any());

        mockMvc.perform(put("/admin/user/1/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"NewPass123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-11 分配角色")
    void shouldAssignRoles() throws Exception {
        doNothing().when(userService).assignRoles(any());

        mockMvc.perform(put("/admin/user/1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleIds\":[1,2]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
