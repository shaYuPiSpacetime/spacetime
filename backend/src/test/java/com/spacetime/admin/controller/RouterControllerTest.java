package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.RouterVO;
import com.spacetime.admin.service.MenuService;
import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("RouterController L2 测试")
class RouterControllerTest {

    @Mock
    private MenuService menuService;

    @InjectMocks
    private RouterController routerController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(routerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        UserContextHolder.set(new UserContext(1L, "peter", null, List.of("system:user:list")));
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("L2-25 获取当前用户动态路由")
    void shouldReturnUserRouters() throws Exception {
        RouterVO vo = new RouterVO();
        vo.setId(1L);
        vo.setName("System");
        vo.setPath("/system");
        vo.setComponent("/system/Layout");
        when(menuService.getUserRouters(1L)).thenReturn(List.of(vo));

        mockMvc.perform(get("/admin/routers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("System"));
    }
}
