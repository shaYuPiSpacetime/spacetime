package com.spacetime.admin.controller;

import com.spacetime.admin.service.PromotionSettlementAdminService;
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

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    @DisplayName("F3-P0-09 待结算单可标记确认")
    void confirm_shouldReturnSuccess() throws Exception {
        mockMvc.perform(put("/admin/promotion/settlements/1/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"财务确认\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).confirm(1L, "财务确认");
    }

    @Test
    @DisplayName("F3-P0-10 已确认结算单可标记发放")
    void paid_shouldReturnSuccess() throws Exception {
        mockMvc.perform(put("/admin/promotion/settlements/1/paid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paidAmount\":100,\"remark\":\"已转账\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
