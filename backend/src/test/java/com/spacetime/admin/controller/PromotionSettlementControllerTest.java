package com.spacetime.admin.controller;

import com.spacetime.admin.service.PromotionSettlementAdminService;
import com.spacetime.common.exception.BusinessException;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionSettlementController L2 测试")
class PromotionSettlementControllerTest {

    @Mock
    private PromotionSettlementAdminService service;

    @InjectMocks
    private PromotionSettlementController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-10 结算周期参数校验由 Service 拦截")
    void create_invalidPeriod_shouldReturnBusinessError() throws Exception {
        when(service.create(any())).thenThrow(new BusinessException("结算开始日期不能晚于结束日期"));

        mockMvc.perform(post("/admin/promotion/settlements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":1,\"periodStart\":\"2026-05-02\",\"periodEnd\":\"2026-05-01\",\"payableAmount\":100}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(5001))
                .andExpect(jsonPath("$.msg").value("结算开始日期不能晚于结束日期"));
    }

    @Test
    @DisplayName("F3-P0-08 生成结算单返回 ID")
    void create_shouldReturnId() throws Exception {
        when(service.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/promotion/settlements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":1,\"periodStart\":\"2026-05-01\",\"periodEnd\":\"2026-05-31\",\"payableAmount\":100}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }
}
