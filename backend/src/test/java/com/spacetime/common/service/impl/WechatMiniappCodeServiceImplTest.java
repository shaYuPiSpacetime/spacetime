package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 微信小程序码服务测试。 */
class WechatMiniappCodeServiceImplTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private WechatMiniappProperties properties;
    private HttpClient httpClient;
    private WechatMiniappCodeServiceImpl service;

    @BeforeEach
    void setUp() {
        properties = new WechatMiniappProperties();
        properties.setCodeEnvVersion("trial");
        httpClient = mock(HttpClient.class);
        service = new WechatMiniappCodeServiceImpl(
                properties, objectMapper, httpClient, () -> "access-token");
    }

    @Test
    void generateUnlimitedCodeUsesOfficialEndpointAndTrialVersion() throws Exception {
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47};
        reply(200, "image/png", png);

        byte[] result = service.generateUnlimitedCode(
                "1a7f66e3d9654c81813f3b2b0dafdb45",
                "pages/promotion/invite-home");

        assertThat(result).containsExactly(png);
        HttpRequest request = request();
        assertThat(request.uri().getPath()).isEqualTo("/wxa/getwxacodeunlimit");
        assertThat(request.uri().getQuery()).contains("access_token=access-token");
        var body = objectMapper.readTree(requestBody(request));
        assertThat(body.path("scene").asText())
                .isEqualTo("1a7f66e3d9654c81813f3b2b0dafdb45");
        assertThat(body.path("page").asText()).isEqualTo("pages/promotion/invite-home");
        assertThat(body.path("env_version").asText()).isEqualTo("trial");
        assertThat(body.path("check_path").asBoolean()).isFalse();
    }

    @Test
    void jsonErrorResponseIsRejectedInsteadOfReturnedAsImage() throws Exception {
        reply(200, "application/json", "{\"errcode\":41030,\"errmsg\":\"invalid page\"}"
                .getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.generateUnlimitedCode(
                "1a7f66e3d9654c81813f3b2b0dafdb45",
                "pages/promotion/invite-home"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("小程序码生成失败");
    }

    private void reply(int status, String contentType, byte[] body) throws Exception {
        @SuppressWarnings("unchecked")
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        when(response.headers()).thenReturn(java.net.http.HttpHeaders.of(
                java.util.Map.of("Content-Type", java.util.List.of(contentType)),
                (left, right) -> true));
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
    }

    private HttpRequest request() throws Exception {
        ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(captor.capture(), any(HttpResponse.BodyHandler.class));
        return captor.getValue();
    }

    private String requestBody(HttpRequest request) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<>() {
            @Override public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
            }
            @Override public void onNext(ByteBuffer item) {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                output.writeBytes(bytes);
            }
            @Override public void onError(Throwable throwable) {
                throw new AssertionError(throwable);
            }
            @Override public void onComplete() { }
        });
        return output.toString(StandardCharsets.UTF_8);
    }
}
