package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.DictDataVO;
import com.spacetime.admin.service.DictDataService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("DictDataController L2 测试")
class DictDataControllerTest {

    @Mock
    private DictDataService dictDataService;

    @InjectMocks
    private DictDataController dictDataController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(dictDataController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-D2-01 树查询路由绑定")
    void shouldReturnDictDataTree() throws Exception {
        DictDataVO vo = new DictDataVO();
        vo.setId(1L);
        vo.setDictLabel("男");
        vo.setDictValue("male");
        when(dictDataService.tree(eq("gender"))).thenReturn(List.of(vo));

        mockMvc.perform(get("/admin/dict-data/tree?dictType=gender"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].dictLabel").value("男"));
    }

    @Test
    @DisplayName("L2-D2-02 创建路由+校验")
    void shouldCreateDictData() throws Exception {
        when(dictDataService.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/dict-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dictType\":\"gender\",\"dictLabel\":\"男\",\"dictValue\":\"male\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("L2-D2-04 更新路由绑定")
    void shouldUpdateDictData() throws Exception {
        doNothing().when(dictDataService).update(any());

        mockMvc.perform(put("/admin/dict-data/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dictType\":\"gender\",\"dictLabel\":\"已更新\",\"dictValue\":\"updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-D2-05 删除路由绑定")
    void shouldDeleteDictData() throws Exception {
        doNothing().when(dictDataService).delete(1L);

        mockMvc.perform(delete("/admin/dict-data/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
