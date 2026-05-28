package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.service.PromotionAgentAdminService;
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
@DisplayName("PromotionAgentController L2 测试")
class PromotionAgentControllerTest {

    @Mock
    private PromotionAgentAdminService service;

    @InjectMocks
    private PromotionAgentController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-08 新增代理缺少代理名称返回参数错误")
    void create_shouldValidateAgentName() throws Exception {
        mockMvc.perform(post("/admin/promotion/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"school\":\"北京大学\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001));
    }

    @Test
    @DisplayName("L2-09 生成校园代理二维码返回 qrCode 和 miniappPath")
    void regenerateCode_shouldReturnQrCode() throws Exception {
        PromotionAgentQrCodeVO vo = new PromotionAgentQrCodeVO();
        vo.setQrCode("A001");
        vo.setMiniappPath("/pages/index/index?qrCode=A001");
        vo.setStatus("enabled");
        when(service.regenerateCode(1L)).thenReturn(vo);

        mockMvc.perform(post("/admin/promotion/agents/1/qr-codes/regenerate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.qrCode").value("A001"))
                .andExpect(jsonPath("$.data.miniappPath").value("/pages/index/index?qrCode=A001"));
    }
}
