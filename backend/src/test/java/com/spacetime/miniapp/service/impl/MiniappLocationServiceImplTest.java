package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.TencentMapProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.ReverseGeocodeVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 腾讯地图逆地址解析服务测试。 */
@DisplayName("腾讯地图逆地址解析")
class MiniappLocationServiceImplTest {

    private TencentMapProperties properties;
    private HttpClient httpClient;
    private MiniappLocationServiceImpl service;

    @BeforeEach
    void setUp() {
        properties = new TencentMapProperties();
        properties.setKey("test-map-key");
        properties.setRequestTimeoutMillis(5000);
        httpClient = mock(HttpClient.class);
        service = new MiniappLocationServiceImpl(properties, new ObjectMapper(), httpClient);
    }

    @Test
    @DisplayName("成功时返回腾讯地图原始省市名称并按纬度经度顺序发起请求")
    void returnsProvinceAndCityFromTencentResponse() throws Exception {
        mockResponse(200, "{\"status\":0,\"result\":{\"address_component\":{\"province\":\"上海市\",\"city\":\"上海市\"}}}");

        ReverseGeocodeVO result = service.reverseGeocode(31.2304, 121.4737);

        assertThat(result.getProvince()).isEqualTo("上海市");
        assertThat(result.getCity()).isEqualTo("上海市");
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(request.getValue().uri().getScheme()).isEqualTo("https");
        assertThat(request.getValue().uri().getHost()).isEqualTo("apis.map.qq.com");
        assertThat(request.getValue().uri().getPath()).isEqualTo("/ws/geocoder/v1/");
        assertThat(request.getValue().uri().getQuery()).contains("location=31.2304,121.4737", "key=test-map-key");
        assertThat(request.getValue().timeout()).contains(Duration.ofMillis(5000));
    }

    @Test
    @DisplayName("未配置服务端地图密钥时拒绝请求且不调用第三方")
    void rejectsMissingServerSideKey() throws Exception {
        properties.setKey(" ");

        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 121.4737))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("定位服务暂不可用");
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("无效坐标不能进入外部接口")
    void rejectsInvalidCoordinates() throws Exception {
        assertThatThrownBy(() -> service.reverseGeocode(Double.NaN, 121.4737))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.reverseGeocode(91, 121.4737))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 181))
                .isInstanceOf(BusinessException.class);
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("第三方返回非零状态时只给用户安全提示")
    void returnsSafeErrorWhenTencentRejectsRequest() throws Exception {
        mockResponse(200, "{\"status\":110,\"message\":\"invalid test-map-key\"}");

        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 121.4737))
                .isInstanceOf(BusinessException.class)
                .hasMessage("定位城市识别失败，请手动选择")
                .hasMessageNotContaining("test-map-key");
    }

    @Test
    @DisplayName("第三方网络故障不泄露地图密钥")
    void returnsSafeErrorWhenTencentNetworkFails() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("request failed: test-map-key"));

        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 121.4737))
                .isInstanceOf(BusinessException.class)
                .hasMessage("定位城市识别失败，请手动选择")
                .hasMessageNotContaining("test-map-key");
    }

    @Test
    @DisplayName("第三方非成功 HTTP 状态返回安全提示")
    void returnsSafeErrorWhenTencentHttpFails() throws Exception {
        mockResponse(502, "bad gateway");

        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 121.4737))
                .isInstanceOf(BusinessException.class)
                .hasMessage("定位城市识别失败，请手动选择");
    }

    @Test
    @DisplayName("第三方未返回省市时不会把空城市交给小程序")
    void rejectsIncompleteTencentAddress() throws Exception {
        mockResponse(200, "{\"status\":0,\"result\":{\"address_component\":{\"province\":\"上海市\",\"city\":\"\"}}}");

        assertThatThrownBy(() -> service.reverseGeocode(31.2304, 121.4737))
                .isInstanceOf(BusinessException.class)
                .hasMessage("定位城市识别失败，请手动选择");
    }

    @SuppressWarnings("unchecked")
    private void mockResponse(int statusCode, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(statusCode);
        when(response.body()).thenReturn(body);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
    }
}
