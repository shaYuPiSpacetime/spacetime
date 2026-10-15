package com.spacetime.common.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpRequest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/** 所有微信服务统一获取稳定凭证，避免并发获取使其他服务持有的凭证失效。 */
public final class WechatStableTokenRequest {
    private WechatStableTokenRequest() { }

    public static HttpRequest create(ObjectMapper mapper, String appId, String secret) throws JsonProcessingException {
        return HttpRequest.newBuilder(URI.create("https://api.weixin.qq.com/cgi-bin/stable_token"))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of(
                        "grant_type", "client_credential", "appid", appId,
                        "secret", secret, "force_refresh", false)), StandardCharsets.UTF_8))
                .build();
    }
}
