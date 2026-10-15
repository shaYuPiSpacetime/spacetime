package com.spacetime.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.WechatCommunityContentSecurityAdapter;
import com.spacetime.common.community.CommunitySecurityConclusion;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.service.LocalSensitiveWordService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class WechatCommunityContentSecurityAdapterTest {
    @Test
    @SuppressWarnings("unchecked")
    void expiredCredentialRefreshesWithStableTokenWithoutDisablingSecurity() throws Exception {
        var props = new WechatMiniappProperties(); props.setAppId("test-app"); props.setAppSecret("test-secret");
        var redis = mock(StringRedisTemplate.class);
        ValueOperations<String,String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(anyString())).thenReturn("old-token", null);
        var http = mock(HttpClient.class);
        List<HttpRequest> requests = new ArrayList<>();
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenAnswer(invocation -> {
            HttpRequest request = invocation.getArgument(0); requests.add(request);
            HttpResponse<String> response = mock(HttpResponse.class);
            when(response.statusCode()).thenReturn(200);
            String body;
            if (requests.size() == 1) body = "{\"errcode\":40001}";
            else if (requests.size() == 2) {
                assertThat(request.uri().getPath()).isEqualTo("/cgi-bin/stable_token");
                assertThat(request.method()).isEqualTo("POST");
                assertThat(request.uri().getQuery()).isNull();
                var payload = new ObjectMapper().readTree(readBody(request));
                assertThat(payload.path("force_refresh").asBoolean(true)).isFalse();
                assertThat(payload.path("appid").asText()).isEqualTo("test-app");
                body = "{\"access_token\":\"fresh-token\",\"expires_in\":7200}";
            } else body = "{\"errcode\":0,\"result\":{\"suggest\":\"pass\"}}";
            when(response.body()).thenReturn(body); return response;
        });
        var adapter = new WechatCommunityContentSecurityAdapter(props, redis, new ObjectMapper(), mock(LocalSensitiveWordService.class));
        ReflectionTestUtils.setField(adapter,"httpClient",http);
        assertThat(adapter.checkText("test-openid", "普通评论", "community").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        assertThat(requests).hasSize(3);
        assertThat(requests.get(2).uri().getQuery()).isEqualTo("access_token=fresh-token");
    }

    private String readBody(HttpRequest request) throws Exception {
        var result = new CompletableFuture<String>(); var out = new java.io.ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
            public void onNext(ByteBuffer value) { byte[] data=new byte[value.remaining()]; value.get(data); out.writeBytes(data); }
            public void onError(Throwable error) { result.completeExceptionally(error); }
            public void onComplete() { result.complete(out.toString(StandardCharsets.UTF_8)); }
        });
        return result.get();
    }
}
