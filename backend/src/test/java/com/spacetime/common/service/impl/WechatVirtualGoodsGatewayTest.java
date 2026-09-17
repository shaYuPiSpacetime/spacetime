package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.VirtualGoodsGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.concurrent.Flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WechatVirtualGoodsGatewayTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private WechatVirtualPayProperties properties;
    private HttpClient httpClient;
    private WechatVirtualGoodsGateway gateway;

    @BeforeEach
    void setUp() {
        properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setOfferId("offer-id");
        properties.setAppKey("test-app-key");
        properties.setEnv(0);
        httpClient = mock(HttpClient.class);
        gateway = new WechatVirtualGoodsGateway(properties, mapper, httpClient, () -> "access-token");
    }

    @Test
    void uploadShouldSignOfficialRequestAndSubmitOneCompleteItem() throws Exception {
        reply("{\"errcode\":0,\"errmsg\":\"\"}");

        gateway.upload("coin_10_v2", "1000千寻币", 9900, "千寻币套餐", "https://example.com/goods.png");

        HttpRequest request = request();
        assertThat(request.uri().getPath()).isEqualTo("/xpay/start_upload_goods");
        String body = requestBody(request);
        var payload = mapper.readTree(body);
        assertThat(payload.path("env").asInt()).isZero();
        assertThat(payload.path("upload_item").size()).isEqualTo(1);
        var item = payload.path("upload_item").get(0);
        assertThat(item.path("id").asText()).isEqualTo("coin_10_v2");
        assertThat(item.path("name").asText()).isEqualTo("1000千寻币");
        assertThat(item.path("price").asInt()).isEqualTo(9900);
        assertThat(item.path("remark").asText()).isEqualTo("千寻币套餐");
        assertThat(item.path("item_url").asText()).isEqualTo("https://example.com/goods.png");
        assertThat(request.uri().getQuery()).contains("access_token=access-token");
        assertThat(request.uri().getQuery()).contains("pay_sig=" + sign("/xpay/start_upload_goods&" + body));
    }

    @Test
    void uploadQueryShouldOnlySucceedForMatchingProductAndPrice() throws Exception {
        reply("{\"errcode\":0,\"status\":3,\"upload_item\":[{\"id\":\"coin_10_v2\",\"price\":9900,\"upload_status\":2}]}");

        VirtualGoodsGateway.GoodsTaskSnapshot snapshot = gateway.queryUpload("coin_10_v2");

        assertThat(snapshot.successful()).isTrue();
        assertThat(snapshot.priceFen()).isEqualTo(9900);
        assertThat(request().uri().getPath()).isEqualTo("/xpay/query_upload_goods");
    }

    @Test
    void publishQueryMustNotAcceptUnrelatedGlobalTaskAsSuccess() throws Exception {
        reply("{\"errcode\":0,\"status\":3,\"publish_item\":[{\"id\":\"other_sku\",\"publish_status\":2}]}");

        VirtualGoodsGateway.GoodsTaskSnapshot snapshot = gateway.queryPublish("coin_10_v2");

        assertThat(snapshot.successful()).isFalse();
        assertThat(snapshot.itemState()).isEqualTo(VirtualGoodsGateway.ItemState.MISSING);
    }

    @Test
    void publishShouldUseOneItemAndSignedOfficialEndpoint() throws Exception {
        reply("{\"errcode\":0,\"errmsg\":\"\"}");

        gateway.publish("coin_10_v2");

        HttpRequest request = request();
        String body = requestBody(request);
        assertThat(request.uri().getPath()).isEqualTo("/xpay/start_publish_goods");
        assertThat(mapper.readTree(body).path("publish_item").get(0).path("id").asText())
                .isEqualTo("coin_10_v2");
        assertThat(request.uri().getQuery()).contains("pay_sig=" + sign("/xpay/start_publish_goods&" + body));
    }

    @Test
    void uploadShouldRejectInvalidProductBeforeNetworkRequest() {
        assertThatThrownBy(() -> gateway.upload("123456789012345678901", "套餐", 100, "说明", "https://example.com/goods.png"))
                .isInstanceOf(BusinessException.class);
    }

    private void reply(String body) throws Exception {
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(body);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    }

    private HttpRequest request() throws Exception {
        ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(captor.capture(), any(HttpResponse.BodyHandler.class));
        return captor.getValue();
    }

    private String requestBody(HttpRequest request) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<>() {
            @Override public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            @Override public void onNext(ByteBuffer item) {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                output.writeBytes(bytes);
            }
            @Override public void onError(Throwable throwable) { throw new AssertionError(throwable); }
            @Override public void onComplete() { }
        });
        return output.toString(StandardCharsets.UTF_8);
    }

    private String sign(String input) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(properties.getAppKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
    }
}
