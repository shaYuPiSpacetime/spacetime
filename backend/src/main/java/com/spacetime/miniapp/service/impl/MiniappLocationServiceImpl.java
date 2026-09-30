package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.TencentMapProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.ReverseGeocodeVO;
import com.spacetime.miniapp.service.MiniappLocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** 通过腾讯地图 WebService 识别小程序定位城市。 */
@Service
public class MiniappLocationServiceImpl implements MiniappLocationService {
    /** 腾讯地图逆地址解析地址。 */
    private static final String GEOCODER_URL = "https://apis.map.qq.com/ws/geocoder/v1/";
    /** 对客户端稳定展示的失败提示。 */
    private static final String LOCATION_FAILED = "定位城市识别失败，请手动选择";

    /** 地图服务配置。 */
    private final TencentMapProperties properties;
    /** JSON 解析器。 */
    private final ObjectMapper objectMapper;
    /** HTTP 客户端。 */
    private final HttpClient httpClient;

    /** 注入生产 HTTP 客户端。 */
    @Autowired
    public MiniappLocationServiceImpl(TencentMapProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMillis()))
                .build());
    }

    /** 注入可测试的 HTTP 客户端。 */
    MiniappLocationServiceImpl(TencentMapProperties properties, ObjectMapper objectMapper, HttpClient httpClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    public ReverseGeocodeVO reverseGeocode(double latitude, double longitude) {
        // 1. 先验证服务端配置与坐标，避免无效请求消耗腾讯地图调用配额。
        if (properties.getKey() == null || properties.getKey().isBlank()) {
            throw new BusinessException("定位服务暂不可用，请手动选择城市");
        }
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new BusinessException("定位坐标无效，请手动选择城市");
        }

        // 2. 服务端代为请求腾讯地图；密钥只出现在服务端请求中，不转发给小程序。
        String location = Double.toString(latitude) + "," + Double.toString(longitude);
        String encodedKey = URLEncoder.encode(properties.getKey().trim(), StandardCharsets.UTF_8);
        URI uri = URI.create(GEOCODER_URL + "?location=" + location + "&key=" + encodedKey);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofMillis(Math.max(1, properties.getRequestTimeoutMillis())))
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new BusinessException(LOCATION_FAILED);
            }

            // 3. 只解析前端所需的省市，第三方错误消息和密钥均不透传。
            JsonNode body = objectMapper.readTree(response.body());
            JsonNode address = body.path("result").path("address_component");
            String province = address.path("province").asText("").trim();
            String city = address.path("city").asText("").trim();
            if (body.path("status").asInt(-1) != 0 || province.isBlank() || city.isBlank()) {
                throw new BusinessException(LOCATION_FAILED);
            }
            return new ReverseGeocodeVO(province, city);
        } catch (BusinessException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException(LOCATION_FAILED);
        } catch (Exception ex) {
            // 第三方异常可能包含带密钥的 URL，不能把原始异常内容写入业务响应或日志。
            throw new BusinessException(LOCATION_FAILED);
        }
    }
}
