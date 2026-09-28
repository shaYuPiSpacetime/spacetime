package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatMiniappCodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/** 微信 getwxacodeunlimit 接口实现。 */
@Slf4j
@Service
public class WechatMiniappCodeServiceImpl implements WechatMiniappCodeService {

    private static final String API_BASE_URL = "https://api.weixin.qq.com";
    private static final String CODE_URI = "/wxa/getwxacodeunlimit";
    private static final String TOKEN_CACHE_KEY = "wechat:miniapp:access_token:";
    private static final Set<String> ENV_VERSIONS = Set.of("release", "trial", "develop");

    private final WechatMiniappProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Supplier<String> accessTokenSupplier;

    @Autowired
    public WechatMiniappCodeServiceImpl(WechatMiniappProperties properties,
                                        StringRedisTemplate redisTemplate,
                                        ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        this.accessTokenSupplier = () -> accessToken(redisTemplate);
    }

    WechatMiniappCodeServiceImpl(WechatMiniappProperties properties, ObjectMapper objectMapper,
                                 HttpClient httpClient, Supplier<String> accessTokenSupplier) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.accessTokenSupplier = accessTokenSupplier;
    }

    @Override
    public byte[] generateUnlimitedCode(String scene, String page) {
        validate(scene, page);
        try {
            String accessToken = accessTokenSupplier.get();
            if (accessToken == null || accessToken.isBlank()) {
                throw generationFailed();
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("scene", scene);
            payload.put("page", page);
            payload.put("check_path", false);
            payload.put("env_version", codeEnvVersion());
            payload.put("width", 430);
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_BASE_URL + CODE_URI + "?access_token=" + encode(accessToken)))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<byte[]> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw generationFailed();
            }
            byte[] image = response.body();
            if (isJson(response, image)) {
                JsonNode root = objectMapper.readTree(image);
                log.warn("微信小程序码生成失败，微信错误码={}", root.path("errcode").asInt(-1));
                throw generationFailed();
            }
            if (image == null || image.length == 0) {
                throw generationFailed();
            }
            return image;
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw generationFailed();
        } catch (Exception exception) {
            log.warn("微信小程序码生成异常：{}", exception.getClass().getSimpleName());
            throw generationFailed();
        }
    }

    private String accessToken(StringRedisTemplate redisTemplate) {
        String appId = properties.getAppId();
        String appSecret = properties.getAppSecret();
        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            throw generationFailed();
        }
        String cacheKey = TOKEN_CACHE_KEY + appId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        try {
            String url = API_BASE_URL + "/cgi-bin/token?grant_type=client_credential&appid="
                    + encode(appId) + "&secret=" + encode(appSecret);
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12)).GET().build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode root = objectMapper.readTree(response.body());
            String token = root.path("access_token").asText();
            if (response.statusCode() < 200 || response.statusCode() >= 300 || token.isBlank()) {
                throw generationFailed();
            }
            long ttl = Math.max(60L, root.path("expires_in").asLong(7200L) - 300L);
            redisTemplate.opsForValue().set(cacheKey, token, Duration.ofSeconds(ttl));
            return token;
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw generationFailed();
        } catch (Exception exception) {
            log.warn("微信接口凭证获取异常：{}", exception.getClass().getSimpleName());
            throw generationFailed();
        }
    }

    private boolean isJson(HttpResponse<byte[]> response, byte[] body) {
        boolean jsonContentType = response.headers().firstValue("Content-Type")
                .map(value -> value.toLowerCase().contains("json"))
                .orElse(false);
        if (jsonContentType) {
            return true;
        }
        if (body == null) {
            return false;
        }
        for (byte value : body) {
            if (!Character.isWhitespace(value)) {
                return value == '{';
            }
        }
        return false;
    }

    private String codeEnvVersion() {
        String configured = properties.getCodeEnvVersion();
        return ENV_VERSIONS.contains(configured) ? configured : "release";
    }

    private void validate(String scene, String page) {
        if (scene == null || !scene.matches("[A-Za-z0-9._~-]{1,32}")) {
            throw generationFailed();
        }
        if (page == null || !page.matches("[A-Za-z0-9_/-]{1,128}") || page.startsWith("/")) {
            throw generationFailed();
        }
    }

    private BusinessException generationFailed() {
        return new BusinessException(70006, "小程序码生成失败，请重试");
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
