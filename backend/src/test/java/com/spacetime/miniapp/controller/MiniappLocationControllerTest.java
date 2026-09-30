package com.spacetime.miniapp.controller;

import com.spacetime.miniapp.dto.response.ReverseGeocodeVO;
import com.spacetime.miniapp.service.MiniappLocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 小程序定位接口测试。 */
@ExtendWith(MockitoExtension.class)
@DisplayName("小程序定位接口")
class MiniappLocationControllerTest {

    @Mock
    private MiniappLocationService locationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MiniappLocationController(locationService)).build();
    }

    @Test
    @DisplayName("按经纬度返回省市名称")
    void returnsReverseGeocodedCity() throws Exception {
        when(locationService.reverseGeocode(31.2304, 121.4737))
                .thenReturn(new ReverseGeocodeVO("上海市", "上海市"));

        mockMvc.perform(post("/miniapp/location/reverse-geocode")
                        .contentType("application/json")
                        .content("{\"latitude\":31.2304,\"longitude\":121.4737}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.province").value("上海市"))
                .andExpect(jsonPath("$.data.city").value("上海市"));
        verify(locationService).reverseGeocode(31.2304, 121.4737);
    }

    @Test
    @DisplayName("经纬度不能再通过 URL 查询参数提交")
    void rejectsCoordinatesInQueryString() throws Exception {
        mockMvc.perform(get("/miniapp/location/reverse-geocode")
                        .param("latitude", "31.2304")
                        .param("longitude", "121.4737"))
                .andExpect(status().isMethodNotAllowed());
    }
}
