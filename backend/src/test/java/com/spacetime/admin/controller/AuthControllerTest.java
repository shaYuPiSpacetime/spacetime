package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.AuthService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController L2 测试")
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-01 正常登录返回 token 和权限列表")
    void shouldReturnTokenAndPermissions() throws Exception {
        LoginVO vo = new LoginVO();
        vo.setToken("test-token-uuid");
        vo.setNickname("管理员");
        vo.setPermissions(List.of("system:user:list", "system:role:list"));
        when(authService.login(any(LoginReq.class))).thenReturn(vo);

        mockMvc.perform(post("/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("test-token-uuid"))
                .andExpect(jsonPath("$.data.nickname").value("管理员"))
                .andExpect(jsonPath("$.data.permissions[0]").value("system:user:list"));
    }

    @Test
    @DisplayName("L2-02 缺少 account 触发校验 → code=4001")
    void shouldFailWhenUsernameMissing() throws Exception {
        mockMvc.perform(post("/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001));
    }

    @Test
    @DisplayName("L2-03 登出成功")
    void shouldLogoutSuccessfully() throws Exception {
        mockMvc.perform(post("/admin/logout")
                        .header("X-Auth-Token", "test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
