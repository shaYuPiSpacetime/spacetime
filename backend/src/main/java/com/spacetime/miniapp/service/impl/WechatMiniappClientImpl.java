package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.WechatMiniappClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * 微信小程序开放接口客户端实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatMiniappClientImpl implements WechatMiniappClient {

    private static final String CODE2_SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session";
    private static final String ACCESS_TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
    private static final String PHONE_NUMBER_URL = "https://api.weixin.qq.com/wxa/business/getuserphonenumber";
    private static final String ACCESS_TOKEN_CACHE_KEY = "wechat:miniapp:access_token";

    private final WechatMiniappProperties properties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Override
    public SessionInfo code2Session(String loginCode) {
        assertConfig();
        if (loginCode == null || loginCode.isBlank()) {
            throw new BusinessException("微信登录 code 不能为空");
        }
        try {
            String url = CODE2_SESSION_URL
                    + "?appid=" + encode(properties.getAppId())
                    + "&secret=" + encode(properties.getAppSecret())
                    + "&js_code=" + encode(loginCode)
                    + "&grant_type=authorization_code";
            JsonNode root = sendGet(url);
            assertWechatSuccess(root, "微信登录");
            String openid = root.path("openid").asText();
            if (openid.isBlank()) {
                throw new BusinessException("微信登录失败，未返回 openid");
            }
            String unionid = root.path("unionid").asText(null);
            return new SessionInfo(openid, unionid);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信 jscode2session 异常", ex);
            throw new BusinessException("微信登录失败，请重试");
        }
    }

    @Override
    public PhoneInfo getPhoneNumber(String phoneCode) {
        assertConfig();
        if (phoneCode == null || phoneCode.isBlank()) {
            throw new BusinessException("微信手机号授权 code 不能为空");
        }
        try {
            String accessToken = getAccessToken();
            String body = objectMapper.writeValueAsString(Map.of("code", phoneCode));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PHONE_NUMBER_URL + "?access_token=" + encode(accessToken)))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("微信手机号接口 HTTP 失败: status={}, body={}", response.statusCode(), response.body());
                throw new BusinessException("微信手机号授权失败，请重试");
            }
            JsonNode root = objectMapper.readTree(response.body());
            assertWechatSuccess(root, "微信手机号授权");
            JsonNode phoneInfo = root.path("phone_info");
            String phoneNumber = phoneInfo.path("phoneNumber").asText();
            if (phoneNumber.isBlank()) {
                throw new BusinessException("微信手机号授权失败，未返回手机号");
            }
            return new PhoneInfo(
                    phoneNumber,
                    phoneInfo.path("purePhoneNumber").asText(phoneNumber),
                    phoneInfo.path("countryCode").asText("")
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信 getuserphonenumber 异常", ex);
            throw new BusinessException("微信手机号授权失败，请重试");
        }
    }

    private String getAccessToken() throws Exception {
        String cached = redisTemplate.opsForValue().get(ACCESS_TOKEN_CACHE_KEY);
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        String url = ACCESS_TOKEN_URL
                + "?grant_type=client_credential"
                + "&appid=" + encode(properties.getAppId())
                + "&secret=" + encode(properties.getAppSecret());
        JsonNode root = sendGet(url);
        assertWechatSuccess(root, "微信 access_token");
        String accessToken = root.path("access_token").asText();
        if (accessToken.isBlank()) {
            throw new BusinessException("微信 access_token 获取失败");
        }
        long expiresIn = Math.max(60, root.path("expires_in").asLong(7200) - 300);
        redisTemplate.opsForValue().set(ACCESS_TOKEN_CACHE_KEY, accessToken, Duration.ofSeconds(expiresIn));
        return accessToken;
    }

    private JsonNode sendGet(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(12))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("微信开放接口 HTTP 失败: status={}, body={}", response.statusCode(), response.body());
            throw new BusinessException("微信服务暂不可用，请稍后重试");
        }
        return objectMapper.readTree(response.body());
    }

    private void assertWechatSuccess(JsonNode root, String action) {
        if (root.has("errcode") && root.path("errcode").asInt() != 0) {
            int errcode = root.path("errcode").asInt();
            String errmsg = root.path("errmsg").asText("unknown");
            log.warn("{}失败: errcode={}, errmsg={}", action, errcode, errmsg);
            throw new BusinessException(action + "失败，请重试");
        }
    }

    private void assertConfig() {
        if (properties.getAppId() == null || properties.getAppId().isBlank()) {
            throw new BusinessException("微信小程序 AppID 未配置");
        }
        if (properties.getAppSecret() == null || properties.getAppSecret().isBlank()) {
            throw new BusinessException("微信小程序 AppSecret 未配置");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
