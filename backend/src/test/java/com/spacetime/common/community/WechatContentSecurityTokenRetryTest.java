package com.spacetime.common.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.service.LocalSensitiveWordService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 微信内容安全失效凭证的有界重试回归。 */
class WechatContentSecurityTokenRetryTest {
    @ParameterizedTest
    @ValueSource(ints = {40001, 40014, 42001})
    @SuppressWarnings("unchecked")
    void invalidCredentialShouldRefreshAndRetryAudioOnce(int code) throws Exception {
        WechatMiniappProperties config = new WechatMiniappProperties();
        config.setAppId("wx-test"); config.setAppSecret("unit-test-placeholder");
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("wechat:miniapp:access_token:wx-test")).thenReturn("old-test-token", null);
        HttpClient client = mock(HttpClient.class);
        HttpResponse<String> invalid = mock(HttpResponse.class);
        HttpResponse<String> token = mock(HttpResponse.class);
        HttpResponse<String> accepted = mock(HttpResponse.class);
        when(invalid.statusCode()).thenReturn(200);
        when(invalid.body()).thenReturn("{\"errcode\":" + code + "}");
        lenient().when(token.body()).thenReturn("{\"access_token\":\"new-test-token\",\"expires_in\":7200}");
        lenient().when(accepted.statusCode()).thenReturn(200);
        lenient().when(accepted.body()).thenReturn("{\"errcode\":0,\"trace_id\":\"test-trace\"}");
        when(client.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(invalid, token, accepted);
        var adapter = new WechatCommunityContentSecurityAdapter(config, redis, new ObjectMapper(), mock(LocalSensitiveWordService.class));
        ReflectionTestUtils.setField(adapter, "httpClient", client);

        var result = adapter.checkAudio("test-openid", "https://static.example.com/voice.mp3", "profile");
        assertThat(result.providerCode()).isEqualTo("media_async:test-trace");
        verify(redis).delete("wechat:miniapp:access_token:wx-test");
        verify(client, times(3)).send(any(), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void repeatedTokenErrorShouldStopAfterOneRetry() throws Exception {
        WechatMiniappProperties config = new WechatMiniappProperties();
        config.setAppId("wx-test"); config.setAppSecret("unit-test-placeholder");
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(any())).thenReturn("cached-test-token");
        HttpClient client = mock(HttpClient.class);
        HttpResponse<String> invalid = mock(HttpResponse.class);
        when(invalid.statusCode()).thenReturn(200);
        when(invalid.body()).thenReturn("{\"errcode\":40001}");
        when(client.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(invalid);
        var adapter = new WechatCommunityContentSecurityAdapter(config, redis, new ObjectMapper(), mock(LocalSensitiveWordService.class));
        ReflectionTestUtils.setField(adapter, "httpClient", client);
        var result = adapter.checkAudio("test-openid", "https://static.example.com/voice.mp3", "profile");
        assertThat(result.providerCode()).isNull();
        verify(client, times(2)).send(any(), any(HttpResponse.BodyHandler.class));
        verify(redis, times(1)).delete("wechat:miniapp:access_token:wx-test");
    }
}
