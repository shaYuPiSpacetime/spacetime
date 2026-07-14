package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.RegionTreeVO;
import com.spacetime.miniapp.service.MiniappDictService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("移动端地区字典接口")
class MiniappDictControllerTest {

    @Mock
    private MiniappDictService miniappDictService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MiniappDictController(miniappDictService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("按父编码返回当前一级地区")
    void shouldReturnLocationOptionsByParentCode() throws Exception {
        RegionOptionVO city = new RegionOptionVO();
        city.setCode("410100");
        city.setName("郑州市");
        city.setLevel("CITY");
        city.setHasChildren(true);
        when(miniappDictService.locations("410000")).thenReturn(List.of(city));

        mockMvc.perform(get("/miniapp/dict/locations").param("parentCode", "410000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("410100"))
                .andExpect(jsonPath("$.data[0].level").value("CITY"))
                .andExpect(jsonPath("$.data[0].hasChildren").value(true))
                .andExpect(jsonPath("$.data[0].children").doesNotExist());
    }

    @Test
    @DisplayName("返回小程序省市两级地区树")
    void shouldReturnTwoLevelLocationTree() throws Exception {
        RegionTreeVO city = new RegionTreeVO();
        city.setCode("410100");
        city.setName("郑州市");
        city.setLevel("CITY");
        city.setChildren(List.of());
        RegionTreeVO province = new RegionTreeVO();
        province.setCode("410000");
        province.setName("河南省");
        province.setLevel("PROVINCE");
        province.setChildren(List.of(city));
        when(miniappDictService.twoLevelLocations()).thenReturn(List.of(province));

        mockMvc.perform(get("/miniapp/dict/locations/two-level"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("410000"))
                .andExpect(jsonPath("$.data[0].level").value("PROVINCE"))
                .andExpect(jsonPath("$.data[0].children[0].code").value("410100"))
                .andExpect(jsonPath("$.data[0].children[0].level").value("CITY"))
                .andExpect(jsonPath("$.data[0].children[0].children").isArray());
    }

    @Test
    @DisplayName("返回基础资料页六类字典的code和中文标签")
    void shouldReturnProfileOptions() throws Exception {
        DictOptionVO worker = new DictOptionVO();
        worker.setCode("WORKER");
        worker.setLabel("职场人");
        when(miniappDictService.profileOptions()).thenReturn(Map.of(
                "identity", List.of(worker),
                "educationLevel", List.of(),
                "industry", List.of(),
                "occupation", List.of(),
                "annualIncome", List.of(),
                "maritalStatus", List.of()));

        mockMvc.perform(get("/miniapp/dict/profile-options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.identity[0].code").value("WORKER"))
                .andExpect(jsonPath("$.data.identity[0].label").value("职场人"));
    }
}
