package com.spacetime.common.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.miniapp.service.impl.WechatMiniappClientImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WechatAccessTokenCacheIsolationTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private WechatMiniappProperties properties;

    @BeforeEach
    void setUp() {
        properties = new WechatMiniappProperties();
        properties.setAppId("wx-app-a");
        properties.setAppSecret("secret-a");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get("wechat:miniapp:access_token")).thenReturn("token-for-another-app");
        when(valueOperations.get("wechat:miniapp:access_token:wx-app-a")).thenReturn("token-for-app-a");
    }

    @Test
    void contentSecurityAccessToken_shouldUseAppIdScopedCacheKey() {
        WechatCommunityContentSecurityAdapter adapter = new WechatCommunityContentSecurityAdapter(
                properties, redisTemplate, new ObjectMapper());

        String token = ReflectionTestUtils.invokeMethod(adapter, "accessToken");

        assertThat(token).isEqualTo("token-for-app-a");
    }

    @Test
    void miniappAccessToken_shouldUseAppIdScopedCacheKey() {
        WechatMiniappClientImpl client = new WechatMiniappClientImpl(
                properties, redisTemplate, new ObjectMapper());

        String token = ReflectionTestUtils.invokeMethod(client, "getAccessToken");

        assertThat(token).isEqualTo("token-for-app-a");
    }
}
