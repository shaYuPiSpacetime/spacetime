package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.DictTypeVO;
import com.spacetime.admin.service.DictTypeService;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("DictTypeController L2 测试")
class DictTypeControllerTest {

    @Mock
    private DictTypeService dictTypeService;

    @InjectMocks
    private DictTypeController dictTypeController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(dictTypeController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-D1-01 分页列表路由绑定")
    void shouldReturnDictTypePage() throws Exception {
        DictTypeVO vo = new DictTypeVO();
        vo.setId(1L);
        vo.setDictName("性别");
        vo.setDictType("gender");
        Page<DictTypeVO> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(vo));
        when(dictTypeService.list(any())).thenReturn(page);

        mockMvc.perform(get("/admin/dict-type/list?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.records[0].dictName").value("性别"));
    }

    @Test
    @DisplayName("L2-D1-02 全部枚举路由绑定")
    void shouldReturnAllDictTypes() throws Exception {
        DictTypeVO vo = new DictTypeVO();
        vo.setId(1L);
        vo.setDictName("性别");
        when(dictTypeService.all()).thenReturn(List.of(vo));

        mockMvc.perform(get("/admin/dict-type/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].dictName").value("性别"));
    }

    @Test
    @DisplayName("L2-D1-03 创建路由+校验")
    void shouldCreateDictType() throws Exception {
        when(dictTypeService.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/dict-type")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dictName\":\"测试类型\",\"dictType\":\"test_type\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("L2-D1-05 更新路由绑定")
    void shouldUpdateDictType() throws Exception {
        doNothing().when(dictTypeService).update(any());

        mockMvc.perform(put("/admin/dict-type/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dictName\":\"已更新\",\"dictType\":\"test_type\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-D1-06 删除路由绑定")
    void shouldDeleteDictType() throws Exception {
        doNothing().when(dictTypeService).delete(1L);

        mockMvc.perform(delete("/admin/dict-type/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
