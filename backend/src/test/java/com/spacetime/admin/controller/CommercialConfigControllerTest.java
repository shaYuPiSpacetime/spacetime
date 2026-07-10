package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.service.CommercialAdminService;
import com.spacetime.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommercialConfigController L2 测试")
class CommercialConfigControllerTest {

    @Mock
    private CommercialAdminService commercialAdminService;

    @InjectMocks
    private CommercialConfigController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-01 聚合配置查询返回数据库配置对象")
    void config_shouldReturnAggregateData() throws Exception {
        CommercialConfigVO vo = new CommercialConfigVO();
        vo.setConfigVersion("COMM-UI-20260710");
        when(commercialAdminService.getConfig()).thenReturn(vo);

        mockMvc.perform(get("/admin/commercial/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.configVersion").value("COMM-UI-20260710"));
    }

    @Test
    @DisplayName("L2-02 聚合保存完整绑定权益、套餐和场景稳定 ID")
    void saveConfig_shouldBindStableIds() throws Exception {
        when(commercialAdminService.saveConfig(any())).thenReturn(new CommercialConfigVO());
        String body = """
                {
                  "vipBenefits": [{"id":10,"benefitCode":"heart_list","benefitName":"心动名单一键揭晓","benefitType":"心动名单"}],
                  "vipPackages": [{"id":8,"packageName":"连续包年","packageType":"continuous","price":568,"durationDays":365}],
                  "coinPackages": [{"id":11,"packageName":"3000千寻币","amount":268,"coinCount":3000}],
                  "coinScenes": [{"id":9,"sceneCode":"whisper","mobileName":"送悄悄话","unitPrice":12}],
                  "settings": {"idealBatchMax":5,"idealRetentionDays":90,"normalViewQuota":10,"vipViewQuota":20,"vipExpireRemindDays":3,"refundDisplay":true,"exposureReserveEnabled":false}
                }
                """;

        mockMvc.perform(put("/admin/commercial/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        ArgumentCaptor<CommercialConfigSaveReq> captor = ArgumentCaptor.forClass(CommercialConfigSaveReq.class);
        verify(commercialAdminService).saveConfig(captor.capture());
        CommercialConfigSaveReq request = captor.getValue();
        assertThat(request.getVipBenefits().get(0).getId()).isEqualTo(10L);
        assertThat(request.getVipPackages().get(0).getId()).isEqualTo(8L);
        assertThat(request.getCoinPackages().get(0).getId()).isEqualTo(11L);
        assertThat(request.getCoinScenes().get(0).getId()).isEqualTo(9L);
        assertThat(request.getSettings().getIdealRetentionDays()).isEqualTo(90);
    }

    @Test
    @DisplayName("L2-03 缺少套餐必填字段时在 Controller 层拒绝")
    void saveConfig_shouldRejectMissingRequiredFields() throws Exception {
        mockMvc.perform(put("/admin/commercial/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vipPackages\":[{\"id\":8}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001))
                .andExpect(jsonPath("$.msg").value(org.hamcrest.Matchers.containsString("套餐名称不能为空")));

        verify(commercialAdminService, never()).saveConfig(any());
    }
}
