package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.VirtualGoodsGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * 微信虚拟商品管理接口。上传和发布任务是环境级单任务，调用方必须串行编排。
 */
@Slf4j
@Service
public class WechatVirtualGoodsGateway implements VirtualGoodsGateway {

    private static final String API_BASE_URL = "https://api.weixin.qq.com";
    private static final String TOKEN_CACHE_KEY = "wechat:miniapp:access_token:";
    private static final String UPLOAD_URI = "/xpay/start_upload_goods";
    private static final String QUERY_UPLOAD_URI = "/xpay/query_upload_goods";
    private static final String PUBLISH_URI = "/xpay/start_publish_goods";
    private static final String QUERY_PUBLISH_URI = "/xpay/query_publish_goods";

    private final WechatVirtualPayProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Supplier<String> accessTokenSupplier;

    @Autowired
    public WechatVirtualGoodsGateway(WechatVirtualPayProperties properties,
                                     WechatMiniappProperties miniappProperties,
                                     StringRedisTemplate redisTemplate,
                                     ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        this.accessTokenSupplier = () -> accessToken(miniappProperties, redisTemplate);
    }

    WechatVirtualGoodsGateway(WechatVirtualPayProperties properties, ObjectMapper objectMapper,
                              HttpClient httpClient, Supplier<String> accessTokenSupplier) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.accessTokenSupplier = accessTokenSupplier;
    }

    @Override
    public void upload(String productId, String name, int priceFen, String remark, String imageUrl) {
        validateProductId(productId);
        if (name == null || name.isBlank() || name.codePointCount(0, name.length()) > 20) {
            throw new BusinessException("微信商品名称需为 1 至 20 个字符");
        }
        if (priceFen <= 0) {
            throw new BusinessException("微信商品价格必须大于 0 分");
        }
        if (remark == null || remark.isBlank() || remark.length() > 1024) {
            throw new BusinessException("微信商品备注需为 1 至 1024 个字符");
        }
        if (!isSupportedImageUrl(imageUrl)) {
            throw new BusinessException("微信商品图片需为公网 HTTPS PNG/JPG 地址");
        }
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", productId);
        item.put("name", name);
        item.put("price", priceFen);
        item.put("remark", remark);
        item.put("item_url", imageUrl);
        post(UPLOAD_URI, Map.of("upload_item", List.of(item), "env", properties.getEnv()), "上传微信商品");
    }

    @Override
    public GoodsTaskSnapshot queryUpload(String expectedProductId) {
        validateProductId(expectedProductId);
        JsonNode root = post(QUERY_UPLOAD_URI, Map.of("env", properties.getEnv()), "查询微信商品上传任务");
        return parseTask(root, "upload_item", "upload_status", expectedProductId, true);
    }

    @Override
    public void publish(String productId) {
        validateProductId(productId);
        post(PUBLISH_URI, Map.of("publish_item", List.of(Map.of("id", productId)),
                "env", properties.getEnv()), "发布微信商品");
    }

    @Override
    public GoodsTaskSnapshot queryPublish(String expectedProductId) {
        validateProductId(expectedProductId);
        JsonNode root = post(QUERY_PUBLISH_URI, Map.of("env", properties.getEnv()), "查询微信商品发布任务");
        return parseTask(root, "publish_item", "publish_status", expectedProductId, false);
    }

    private GoodsTaskSnapshot parseTask(JsonNode root, String listField, String statusField,
                                        String expectedProductId, boolean includePrice) {
        TaskState taskState = switch (root.path("status").asInt(-1)) {
            case 0 -> TaskState.NONE;
            case 1 -> TaskState.RUNNING;
            case 3 -> TaskState.SUCCEEDED;
            default -> TaskState.FAILED;
        };
        JsonNode items = root.path(listField);
        if (items.isArray()) {
            for (JsonNode item : items) {
                if (!expectedProductId.equals(item.path("id").asText())) {
                    continue;
                }
                ItemState itemState = switch (item.path(statusField).asInt(-1)) {
                    case 0 -> ItemState.RUNNING;
                    case 1 -> ItemState.ALREADY_EXISTS;
                    case 2 -> ItemState.SUCCEEDED;
                    default -> ItemState.FAILED;
                };
                Integer priceFen = includePrice && item.hasNonNull("price")
                        ? item.path("price").asInt() : null;
                return new GoodsTaskSnapshot(taskState, itemState, expectedProductId,
                        priceFen, item.path("errmsg").asText(null));
            }
        }
        // 微信只保留环境级当前任务；商品不匹配时不得将其他任务的成功误判为本商品成功。
        return new GoodsTaskSnapshot(taskState, ItemState.MISSING, expectedProductId, null,
                "当前微信任务不包含该商品");
    }

    private JsonNode post(String path, Map<String, Object> payload, String action) {
        assertConfig();
        try {
            String body = objectMapper.writeValueAsString(payload);
            String paySig = sign(path + "&" + body);
            String token = accessTokenSupplier.get();
            if (token == null || token.isBlank()) {
                throw new BusinessException("微信接口凭证不可用");
            }
            String url = API_BASE_URL + path + "?access_token=" + encode(token)
                    + "&pay_sig=" + encode(paySig);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(action + "失败，微信接口暂不可用");
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (root.path("errcode").asInt(-1) != 0) {
                int errcode = root.path("errcode").asInt(-1);
                log.warn("{}失败，微信错误码={}", action, errcode);
                throw new BusinessException(action + "失败，微信错误码 " + errcode);
            }
            return root;
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(action + "被中断，请查询任务状态后重试");
        } catch (Exception exception) {
            log.warn("{}异常：{}", action, exception.getClass().getSimpleName());
            throw new BusinessException(action + "结果未知，请查询任务状态后重试");
        }
    }

    private String accessToken(WechatMiniappProperties miniappProperties,
                               StringRedisTemplate redisTemplate) {
        String appId = miniappProperties.getAppId();
        String appSecret = miniappProperties.getAppSecret();
        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            throw new BusinessException("微信小程序凭据未配置");
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
                throw new BusinessException("微信接口凭证获取失败");
            }
            long ttl = Math.max(60L, root.path("expires_in").asLong(7200L) - 300L);
            redisTemplate.opsForValue().set(cacheKey, token, Duration.ofSeconds(ttl));
            return token;
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException("微信接口凭证获取被中断");
        } catch (Exception exception) {
            log.warn("微信接口凭证获取异常：{}", exception.getClass().getSimpleName());
            throw new BusinessException("微信接口凭证获取失败");
        }
    }

    private void assertConfig() {
        if (!properties.isEnabled() || properties.getAppKey() == null
                || properties.getAppKey().isBlank() || (properties.getEnv() != 0 && properties.getEnv() != 1)) {
            throw new BusinessException("微信虚拟支付商品管理未正确配置");
        }
    }

    private void validateProductId(String productId) {
        if (productId == null || !productId.matches("[A-Za-z0-9_-]{1,20}")) {
            throw new BusinessException("微信商品 ID 须为 1 至 20 位字母、数字、下划线或连字符");
        }
    }

    private boolean isSupportedImageUrl(String imageUrl) {
        try {
            URI uri = URI.create(imageUrl);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && uri.getPath().toLowerCase().matches(".*\\.(png|jpg|jpeg)");
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private String sign(String content) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(properties.getAppKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
