package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionRuleConfigController L2 测试")
class PromotionRuleConfigControllerTest {
    @Mock
    private PromotionRuleAdminService service;

    @InjectMocks
    private PromotionRuleConfigController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-01 聚合配置路由返回 PromotionRuleConfigVO")
    void getConfig_shouldReturnRConfigVO() throws Exception {
        PromotionRuleConfigVO vo = new PromotionRuleConfigVO();
        vo.setInviteRewardRules(List.of());
        vo.setAgentBonusRules(List.of());
        vo.setRiskRules(List.of());
        vo.setRelationValidityText("长期有效");
        when(service.config()).thenReturn(vo);

        mockMvc.perform(get("/admin/promotion/rule-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.relationValidityText").value("长期有效"));
    }

    @Test
    @DisplayName("L2-02 普通奖励保存路由绑定请求体")
    void saveInviteReward_shouldBindBody() throws Exception {
        mockMvc.perform(put("/admin/promotion/rule-config/invite-reward")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"events\":[{\"eventType\":\"register_login_reward\",\"enabled\":true,\"amount\":1}],\"successMetric\":\"verify_complete_reward\",\"rewardMode\":\"fixed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).saveInviteReward(any());
    }

    @Test
    @DisplayName("L2-03 风控保存路由绑定请求体")
    void saveRisk_shouldBindBody() throws Exception {
        mockMvc.perform(put("/admin/promotion/rule-config/risk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dailyCap\":50,\"deviceThreshold\":5,\"phoneThreshold\":5,\"paymentThreshold\":3,\"freezeSwitch\":true,\"reviewSwitch\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).saveRiskConfig(any());
    }
}
