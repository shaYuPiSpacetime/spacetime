package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionMaterialController L2 测试")
class PromotionMaterialControllerTest {
    @Mock
    private PromotionAgentAdminService service;

    @InjectMocks
    private PromotionMaterialController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-10 二维码素材列表返回 Page<PromotionAgentQrCodeVO>")
    void list_shouldReturnQrCodePage() throws Exception {
        PromotionAgentQrCodeVO row = code();
        Page<PromotionAgentQrCodeVO> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(row));
        when(service.materials(9L, null, null, 1, 10, "enabled")).thenReturn(page);

        mockMvc.perform(get("/admin/promotion/materials/list?agentId=9&page=1&size=10&status=enabled"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].qrCode").value("QR1"));
    }

    @Test
    @DisplayName("L2-11 二维码重生成路由返回 AgentQrCodeVO")
    void regenerate_shouldReturnQrCodeVO() throws Exception {
        when(service.regenerateMaterialCode(5L)).thenReturn(code());

        mockMvc.perform(post("/admin/promotion/materials/5/regenerate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.versionNo").value(2));
    }

    @Test
    @DisplayName("停用二维码展示调用 Service")
    void disable_shouldCallService() throws Exception {
        mockMvc.perform(put("/admin/promotion/materials/5/disable")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"隐藏\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).disableCode(5L);
    }

    private PromotionAgentQrCodeVO code() {
        PromotionAgentQrCodeVO vo = new PromotionAgentQrCodeVO();
        vo.setId(5L);
        vo.setAgentId(9L);
        vo.setQrCode("QR1");
        vo.setMiniappPath("/pages/index/index?qrCode=QR1");
        vo.setVersionNo(2);
        vo.setStatus("enabled");
        return vo;
    }
}
