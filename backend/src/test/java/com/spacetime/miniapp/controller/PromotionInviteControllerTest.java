package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.miniapp.dto.response.InviteRulesVO;
import com.spacetime.miniapp.dto.response.InviteSourceTraceVO;
import com.spacetime.miniapp.service.PromotionInviteService;
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
@DisplayName("PromotionInviteController L2 测试")
class PromotionInviteControllerTest {

    @Mock
    private PromotionInviteService service;

    @InjectMocks
    private PromotionInviteController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-12/F1-P0-04 二维码来源记录可匿名调用")
    void shareLog_shouldAllowAnonymous() throws Exception {
        InviteSourceTraceVO trace = new InviteSourceTraceVO();
        trace.setTraceNo("TR1");
        trace.setSourceType("normal_user");
        when(service.shareLog(any())).thenReturn(trace);

        mockMvc.perform(post("/miniapp/promotion/invite/share-log")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceType\":\"normal_user\",\"inviterId\":100}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.traceNo").value("TR1"));
    }

    @Test
    @DisplayName("F1-P0-02 活动规则接口返回成功")
    void rules_shouldReturnSuccess() throws Exception {
        InviteRulesVO rules = new InviteRulesVO();
        rules.setSuccessRule("三项认证完成");
        when(service.rules()).thenReturn(rules);

        mockMvc.perform(get("/miniapp/promotion/invite/rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.successRule").value("三项认证完成"));
    }
}
