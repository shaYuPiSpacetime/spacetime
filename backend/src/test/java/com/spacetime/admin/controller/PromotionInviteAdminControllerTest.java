package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;
import com.spacetime.admin.service.PromotionInviteAdminService;
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
@DisplayName("PromotionInviteAdminController L2 测试")
class PromotionInviteAdminControllerTest {
    @Mock
    private PromotionInviteAdminService service;

    @InjectMocks
    private PromotionInviteAdminController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-04 邀请关系列表分页筛选绑定")
    void list_shouldBindPageReq() throws Exception {
        PromotionInviteRelationVO row = new PromotionInviteRelationVO();
        row.setId(1L);
        row.setRelationNo("REL1");
        Page<PromotionInviteRelationVO> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(row));
        when(service.list(any())).thenReturn(page);

        mockMvc.perform(get("/admin/promotion/invite-relations/list?page=1&size=10&status=registered"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].relationNo").value("REL1"));
    }

    @Test
    @DisplayName("L2-05 邀请关系详情路径参数绑定")
    void detail_shouldReturnDetailVO() throws Exception {
        PromotionInviteRelationVO vo = new PromotionInviteRelationVO();
        vo.setId(7L);
        vo.setStatus("registered");
        when(service.detail(7L)).thenReturn(vo);

        mockMvc.perform(get("/admin/promotion/invite-relations/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(7))
                .andExpect(jsonPath("$.data.status").value("registered"));
    }

    @Test
    @DisplayName("L2-06 邀请关系解除冻结调用 Service")
    void unfreeze_shouldCallService() throws Exception {
        mockMvc.perform(put("/admin/promotion/invite-relations/7/unfreeze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"人工复核\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(service).unfreeze(7L, "人工复核");
    }
}
