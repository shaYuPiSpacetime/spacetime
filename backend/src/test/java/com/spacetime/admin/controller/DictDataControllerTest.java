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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("字典数据接口测试")
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
    @DisplayName("L2-D2-01 子节点懒加载路由绑定")
    void shouldReturnDictDataChildren() throws Exception {
        DictDataVO province = new DictDataVO();
        province.setId(1L);
        province.setDictLabel("河南省");
        province.setDictValue("410000");
        province.setHasChildren(true);
        when(dictDataService.children("china_region", 0L)).thenReturn(List.of(province));

        mockMvc.perform(get("/admin/dict-data/children")
                        .param("dictType", "china_region")
                        .param("parentId", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].dictLabel").value("河南省"))
                .andExpect(jsonPath("$.data[0].hasChildren").value(true))
                .andExpect(jsonPath("$.data[0].children").doesNotExist());
    }

    @Test
    @DisplayName("L2-D2-02 创建路由与校验")
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
    @DisplayName("L2-D2-03 更新路由绑定")
    void shouldUpdateDictData() throws Exception {
        doNothing().when(dictDataService).update(any());

        mockMvc.perform(put("/admin/dict-data/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dictType\":\"gender\",\"dictLabel\":\"已更新\",\"dictValue\":\"updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-D2-04 删除路由绑定")
    void shouldDeleteDictData() throws Exception {
        doNothing().when(dictDataService).delete(1L);

        mockMvc.perform(delete("/admin/dict-data/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
