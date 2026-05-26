package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.PromotionRuleVO;
import com.spacetime.admin.service.PromotionRuleAdminService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionRuleController L2 测试")
class PromotionRuleControllerTest {

    @Mock
    private PromotionRuleAdminService service;

    @InjectMocks
    private PromotionRuleController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-01 规则列表路由返回分页")
    void list_shouldReturnPage() throws Exception {
        Page<PromotionRuleVO> page = new Page<>(1, 10, 0);
        when(service.list(any())).thenReturn(page);

        mockMvc.perform(get("/admin/promotion/rules/list?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.current").value(1));
    }

    @Test
    @DisplayName("L2-02 新增规则必填校验")
    void create_shouldValidateBody() throws Exception {
        mockMvc.perform(post("/admin/promotion/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleType\":\"user_invite\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001));
    }

    @Test
    @DisplayName("F2-P0-01 新增规则返回 ID")
    void create_shouldReturnId() throws Exception {
        when(service.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/promotion/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleName\":\"注册奖励\",\"ruleType\":\"user_invite\",\"eventType\":\"register_login_reward\",\"rewardAmount\":10,\"rewardUnit\":\"coin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }
}
