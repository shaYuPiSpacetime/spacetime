package com.spacetime.common.community;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 微信 msgSecCheck/mediaCheckAsync 适配器。图片异步受理后返回 review，待人工复核，绝不提前公开。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "community.content-security.provider", havingValue = "wechat", matchIfMissing = true)
public class WechatCommunityContentSecurityAdapter implements CommunityContentSecurityPort {
    private static final String TOKEN_CACHE_KEY = "wechat:miniapp:access_token";
    private static final String TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
    private static final String MSG_SEC_URL = "https://api.weixin.qq.com/wxa/msg_sec_check";
    private static final String MEDIA_SEC_URL = "https://api.weixin.qq.com/wxa/media_check_async";

    private final WechatMiniappProperties properties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Override
    public CommunitySecurityResult checkText(String openId, String content, String scene) {
        if (content == null || content.isBlank()) {
            return CommunitySecurityResult.pass("empty_text");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", content);
        body.put("version", 2);
        body.put("scene", sceneCode(scene));
        body.put("openid", safeOpenId(openId));
        JsonNode response = post(MSG_SEC_URL, body);
        if (response == null) return CommunitySecurityResult.unavailable("wechat_request_failed");
        int errcode = response.path("errcode").asInt(-1);
        if (errcode != 0) return CommunitySecurityResult.unavailable("wechat_err_" + errcode);
        String suggest = response.path("result").path("suggest").asText("review");
        String label = response.path("result").path("label").asText(null);
        return switch (suggest) {
            case "pass" -> CommunitySecurityResult.pass(String.valueOf(errcode));
            case "risky" -> CommunitySecurityResult.reject(label, "wechat_risky");
            default -> CommunitySecurityResult.review("wechat_review:" + label);
        };
    }

    @Override
    public CommunitySecurityResult checkImages(String openId, List<String> imageUrls, String scene) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return CommunitySecurityResult.pass("empty_media");
        }
        List<String> traceIds = new ArrayList<>();
        for (String imageUrl : imageUrls) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("media_url", imageUrl);
            body.put("media_type", 2);
            body.put("version", 2);
            body.put("scene", sceneCode(scene));
            body.put("openid", safeOpenId(openId));
            JsonNode response = post(MEDIA_SEC_URL, body);
            if (response == null) return CommunitySecurityResult.unavailable("wechat_media_request_failed");
            int errcode = response.path("errcode").asInt(-1);
            if (errcode != 0) return CommunitySecurityResult.unavailable("wechat_media_err_" + errcode);
            String traceId = response.path("trace_id").asText();
            if (traceId.isBlank()) return CommunitySecurityResult.unavailable("wechat_media_trace_missing");
            traceIds.add(traceId);
        }
        return CommunitySecurityResult.asyncReview(String.join(",", traceIds));
    }

    private JsonNode post(String endpoint, Map<String, Object> body) {
        try {
            String token = accessToken();
            if (token == null) return null;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint + "?access_token=" + encode(token)))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) return null;
            return objectMapper.readTree(response.body());
        } catch (Exception ex) {
            log.warn("微信社区内容安全调用失败，按保守策略降级: {}", ex.getClass().getSimpleName());
            return null;
        }
    }

    private String accessToken() {
        try {
            String cached = redisTemplate.opsForValue().get(TOKEN_CACHE_KEY);
            if (cached != null && !cached.isBlank()) return cached;
            if (properties.getAppId() == null || properties.getAppId().isBlank()
                    || properties.getAppSecret() == null || properties.getAppSecret().isBlank()) return null;
            String url = TOKEN_URL + "?grant_type=client_credential&appid=" + encode(properties.getAppId())
                    + "&secret=" + encode(properties.getAppSecret());
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode root = objectMapper.readTree(response.body());
            String token = root.path("access_token").asText();
            if (token.isBlank()) return null;
            long ttl = Math.max(60, root.path("expires_in").asLong(7200) - 300);
            redisTemplate.opsForValue().set(TOKEN_CACHE_KEY, token, Duration.ofSeconds(ttl));
            return token;
        } catch (Exception ex) {
            log.warn("微信 access_token 获取失败，按保守策略降级: {}", ex.getClass().getSimpleName());
            return null;
        }
    }

    private int sceneCode(String scene) {
        return "profile".equalsIgnoreCase(scene) ? 1 : 2;
    }

    private String safeOpenId(String openId) {
        return openId == null ? "" : openId;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
