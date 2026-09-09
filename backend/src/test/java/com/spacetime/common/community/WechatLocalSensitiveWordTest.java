package com.spacetime.common.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.service.LocalSensitiveWordService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** L3-07/08/09：实际微信入口的本地前置与 HTTP 短路。 */
class WechatLocalSensitiveWordTest {
    private final LocalSensitiveWordService local = mock(LocalSensitiveWordService.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final HttpClient http = mock(HttpClient.class);

    private WechatCommunityContentSecurityAdapter adapter() {
        var properties = new WechatMiniappProperties();
        properties.setAppId("test-app"); properties.setAppSecret("test-secret");
        var adapter = new WechatCommunityContentSecurityAdapter(properties, redis, new ObjectMapper(), local);
        ReflectionTestUtils.setField(adapter, "httpClient", http);
        return adapter;
    }

    @ParameterizedTest
    @CsvSource({"pass,PASS", "risky,REJECT", "review,REVIEW", "error,UNAVAILABLE"})
    void unavailableAndThrownLocalCheckPreserveEveryWechatResult(String suggest,CommunitySecurityConclusion expected) throws Exception {
        String body=suggest.equals("error")?"{\"errcode\":40001}":"{\"errcode\":0,\"result\":{\"suggest\":\""+suggest+"\"}}";
        stubWechat(body);
        when(local.checkText("text")).thenReturn(CommunitySecurityResult.unavailable("offline"));
        assertThat(adapter().checkText("openid","text","profile").conclusion()).isEqualTo(expected);
        when(local.checkText("text")).thenThrow(new IllegalStateException());
        assertThat(adapter().checkText("openid","text","profile").conclusion()).isEqualTo(expected);
    }

    @Test
    void localRejectSkipsTokenAndAllWechatCallsIncludingPostImages() {
        var reject = CommunitySecurityResult.reject("local_sensitive_word:1", "evidence");
        when(local.checkText("测试词")).thenReturn(reject);
        var adapter = adapter();
        assertThat(adapter.checkText("openid", "测试词", "profile")).isSameAs(reject);
        assertThat(adapter.checkPost("openid", "测试词", List.of("https://example.org/image.png"), "community")).isSameAs(reject);
        verifyNoInteractions(redis, http);
    }

    @Test
    void localUnavailableContinuesWechat() throws Exception {
        when(local.checkText("正文")).thenReturn(CommunitySecurityResult.unavailable("local_sensitive_word_unavailable"));
        stubWechat("{\"errcode\":0,\"result\":{\"suggest\":\"pass\"}}");
        assertThat(adapter().checkText("openid", "正文", "profile").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        verify(http).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @ParameterizedTest
    @CsvSource({"pass,PASS", "risky,REJECT", "review,REVIEW"})
    void localPassPreservesWechatConclusion(String suggest, CommunitySecurityConclusion expected) throws Exception {
        when(local.checkText("普通正文")).thenReturn(CommunitySecurityResult.pass("local_clear"));
        stubWechat("{\"errcode\":0,\"result\":{\"suggest\":\"" + suggest + "\",\"label\":100}}");
        assertThat(adapter().checkText("openid", "普通正文", "profile").conclusion()).isEqualTo(expected);
        var order = inOrder(local, http);
        order.verify(local).checkText("普通正文");
        order.verify(http).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void localPassPreservesWechatError() throws Exception {
        when(local.checkText("普通正文")).thenReturn(CommunitySecurityResult.pass("local_clear"));
        stubWechat("{\"errcode\":40001}");
        assertThat(adapter().checkText("openid", "普通正文", "community").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
    }

    @Test
    void imagesAndAudioKeepOriginalWechatPath() throws Exception {
        stubWechat("{\"errcode\":0,\"trace_id\":\"trace-1\"}");
        var adapter = adapter();
        assertThat(adapter.checkPost("openid", "", List.of("https://example.org/image.png"), "community").providerCode()).startsWith("media_async:");
        assertThat(adapter.checkAudio("openid", "https://example.org/audio.mp3", "profile").providerCode()).startsWith("media_async:");
        verifyNoInteractions(local);
        verify(http, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @SuppressWarnings("unchecked")
    private void stubWechat(String body) throws Exception {
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("wechat:miniapp:access_token:test-app")).thenReturn("test-token");
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200); when(response.body()).thenReturn(body);
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    }
}
