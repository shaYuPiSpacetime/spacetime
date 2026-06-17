package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.PromotionRewardLogVO;
import com.spacetime.admin.service.PromotionRewardAdminService;
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
@DisplayName("PromotionRewardController L2 测试")
class PromotionRewardControllerTest {
    @Mock
    private PromotionRewardAdminService service;

    @InjectMocks
    private PromotionRewardController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-07 冻结队列固定调用 frozen")
    void frozen_shouldFilterFrozen() throws Exception {
        PromotionRewardLogVO row = new PromotionRewardLogVO();
        row.setId(1L);
        row.setStatus("frozen");
        Page<PromotionRewardLogVO> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(row));
        when(service.frozen(1, 10)).thenReturn(page);

        mockMvc.perform(get("/admin/promotion/invite-rewards/frozen/list?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].status").value("frozen"));
    }

    @Test
    @DisplayName("L2-08 冻结发放路径参数与备注绑定")
    void approve_shouldBindPathAndRemark() throws Exception {
        mockMvc.perform(put("/admin/promotion/invite-rewards/3/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"有效\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).approve(3L, "有效");
    }

    @Test
    @DisplayName("冻结奖励驳回路径参数与备注绑定")
    void reject_shouldBindPathAndRemark() throws Exception {
        mockMvc.perform(put("/admin/promotion/invite-rewards/4/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"无效\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).reject(4L, "无效");
    }
}
