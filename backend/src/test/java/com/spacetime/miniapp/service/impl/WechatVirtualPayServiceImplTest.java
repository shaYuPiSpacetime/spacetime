package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundRequestUnknownException;
import com.spacetime.miniapp.dto.response.WechatVirtualPayParamsVO;
import com.spacetime.miniapp.service.WechatMiniappClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor;

import java.lang.reflect.Constructor;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;

@DisplayName("微信小程序虚拟支付服务测试")
class WechatVirtualPayServiceImplTest {

    private WechatVirtualPayProperties properties;
    private WechatVirtualPayServiceImpl service;

    @BeforeEach
    void setUp() {
        properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setOfferId("offer-1");
        properties.setAppKey("app-key");
        properties.setEnv(0);
        service = new WechatVirtualPayServiceImpl(
                properties,
                mock(WechatMiniappClient.class),
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("存在测试构造器时仍明确声明 Spring 注入构造器")
    void shouldExposeOneSpringAutowiredConstructor() {
        AutowiredAnnotationBeanPostProcessor processor = new AutowiredAnnotationBeanPostProcessor();

        Constructor<?>[] constructors = processor.determineCandidateConstructors(
                WechatVirtualPayServiceImpl.class, "wechatVirtualPayServiceImpl");

        assertThat(constructors).isNotNull().hasSize(1);
        assertThat(constructors[0].getParameterCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("构造道具直购参数时对同一份紧凑 JSON 计算双签名")
    void createPayParamsShouldUseExactSignDataForBothHmacSignatures() {
        WechatVirtualPayParamsVO result = service.createPayParams(
                "TO12345678",
                "vip_7",
                19800,
                "session-key"
        );

        assertThat(result.getMode()).isEqualTo("short_series_goods");
        assertThat(result.getSignData()).isEqualTo(
                "{\"offerId\":\"offer-1\",\"buyQuantity\":1,\"env\":0,"
                        + "\"currencyType\":\"CNY\",\"productId\":\"vip_7\","
                        + "\"goodsPrice\":19800,\"outTradeNo\":\"TO12345678\","
                        + "\"attach\":\"TO12345678\"}"
        );
        assertThat(result.getPaySig())
                .isEqualTo("545153dc905f8675100ae9b80ad5212754063bc435e86b3c56c194a184370615");
        assertThat(result.getSignature())
                .isEqualTo("369d63b3e6f2f685a762abf71890d308f17aab074f5e35f760ca30cd55555cd1");
    }

    @Test
    @DisplayName("启用虚拟支付但缺少现网 AppKey 时拒绝生成参数")
    void createPayParamsShouldRejectMissingAppKey() {
        properties.setAppKey(" ");

        assertThatThrownBy(() -> service.createPayParams(
                "TO12345678", "vip_7", 19800, "session-key"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("AppKey");
    }

    @Test
    @DisplayName("虚拟支付商品价格必须是正整数分")
    void createPayParamsShouldRejectInvalidPrice() {
        assertThatThrownBy(() -> service.createPayParams(
                "TO12345678", "vip_7", 0, "session-key"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("价格");
    }

    @Test
    @DisplayName("虚拟支付网关应提供发起退款与退款查单能力")
    void shouldExposeVirtualRefundOperations() {
        assertThat(Arrays.stream(WechatVirtualPayServiceImpl.class.getMethods())
                .map(method -> method.getName()))
                .contains("requestRefund", "queryRefund");
    }

    @Test
    @DisplayName("发起虚拟退款时按微信官方字段提交并只返回受理结果")
    void requestRefundShouldCallWechatRefundOrderAndParseAcceptedResult() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"errcode\":0,\"errmsg\":\"\","
                + "\"refund_order_id\":\"RF12345678\","
                + "\"refund_wx_order_id\":\"WXRF-1\","
                + "\"pay_order_id\":\"TO12345678\","
                + "\"pay_wx_order_id\":\"WXPAY-1\"}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
        WechatMiniappClient miniappClient = mock(WechatMiniappClient.class);
        when(miniappClient.getAccessToken()).thenReturn("access-token");
        service = new WechatVirtualPayServiceImpl(properties, miniappClient, new ObjectMapper(), httpClient);

        var result = service.requestRefund(
                "openid-1", "TO12345678", "RF12345678", 100, 100, "用户申请退款");

        assertThat(result.refundOrderNo()).isEqualTo("RF12345678");
        assertThat(result.wxRefundOrderNo()).isEqualTo("WXRF-1");
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(request.getValue().uri().getPath()).isEqualTo("/xpay/refund_order");
        assertThat(request.getValue().uri().getQuery())
                .contains("access_token=access-token", "pay_sig=");
        var body = new ObjectMapper().readTree(requestBody(request.getValue()));
        assertThat(body.path("openid").asText()).isEqualTo("openid-1");
        assertThat(body.path("order_id").asText()).isEqualTo("TO12345678");
        assertThat(body.path("refund_order_id").asText()).isEqualTo("RF12345678");
        assertThat(body.path("left_fee").asInt()).isEqualTo(100);
        assertThat(body.path("refund_fee").asInt()).isEqualTo(100);
        assertThat(body.path("biz_meta").asText()).isEqualTo("用户申请退款");
        assertThat(body.path("refund_reason").asText()).isEqualTo("5");
        assertThat(body.path("req_from").asText()).isEqualTo("1");
        assertThat(body.path("env").asInt()).isZero();
    }

    @Test
    @DisplayName("退款接口非 2xx 即使携带错误码也必须视为结果未知")
    void requestRefund_non2xxWithErrcodeShouldRemainUnknown() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(502);
        when(response.body()).thenReturn("{\"errcode\":-1,\"errmsg\":\"system error\"}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
        WechatMiniappClient miniappClient = mock(WechatMiniappClient.class);
        when(miniappClient.getAccessToken()).thenReturn("access-token");
        service = new WechatVirtualPayServiceImpl(properties, miniappClient, new ObjectMapper(), httpClient);

        assertThatThrownBy(() -> service.requestRefund(
                "openid-1", "TO12345678", "RF12345678", 100, 100, "用户申请退款"))
                .isInstanceOf(RefundRequestUnknownException.class);
    }

    @Test
    @DisplayName("退款查单时将微信状态5识别为渠道成功终态")
    void queryRefundShouldParseSuccessfulTerminalState() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"errcode\":0,\"order\":{"
                + "\"order_id\":\"RF12345678\",\"wx_order_id\":\"WXRF-1\","
                + "\"status\":5,\"order_type\":1,\"refund_fee\":100,"
                + "\"paid_time\":1780000000}}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
        WechatMiniappClient miniappClient = mock(WechatMiniappClient.class);
        when(miniappClient.getAccessToken()).thenReturn("access-token");
        service = new WechatVirtualPayServiceImpl(properties, miniappClient, new ObjectMapper(), httpClient);

        var result = service.queryRefund("openid-1", "RF12345678");

        assertThat(result.success()).isTrue();
        assertThat(result.failed()).isFalse();
        assertThat(result.refundFeeFen()).isEqualTo(100);
    }

    @Test
    @DisplayName("退款查单成功响应缺少商户退款单号时必须拒绝")
    void queryRefundShouldRejectMissingRefundOrderId() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"errcode\":0,\"order\":{"
                + "\"wx_order_id\":\"WXRF-1\",\"status\":5,"
                + "\"order_type\":1,\"refund_fee\":100}}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
        WechatMiniappClient miniappClient = mock(WechatMiniappClient.class);
        when(miniappClient.getAccessToken()).thenReturn("access-token");
        service = new WechatVirtualPayServiceImpl(properties, miniappClient, new ObjectMapper(), httpClient);

        assertThatThrownBy(() -> service.queryRefund("openid-1", "RF12345678"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("退款查单返回其他商户退款单号时必须拒绝")
    void queryRefundShouldRejectMismatchedRefundOrderId() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"errcode\":0,\"order\":{"
                + "\"order_id\":\"RF-OTHER-ORDER\",\"wx_order_id\":\"WXRF-1\","
                + "\"status\":5,\"order_type\":1,\"refund_fee\":100}}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);
        WechatMiniappClient miniappClient = mock(WechatMiniappClient.class);
        when(miniappClient.getAccessToken()).thenReturn("access-token");
        service = new WechatVirtualPayServiceImpl(properties, miniappClient, new ObjectMapper(), httpClient);

        assertThatThrownBy(() -> service.queryRefund("openid-1", "RF12345678"))
                .isInstanceOf(BusinessException.class);
    }

    private String requestBody(HttpRequest request) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        CompletableFuture<Void> completed = new CompletableFuture<>();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<>() {
            @Override
            public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item) {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                output.writeBytes(bytes);
            }

            @Override
            public void onError(Throwable throwable) {
                completed.completeExceptionally(throwable);
            }

            @Override
            public void onComplete() {
                completed.complete(null);
            }
        });
        completed.get(1, TimeUnit.SECONDS);
        return output.toString(java.nio.charset.StandardCharsets.UTF_8);
    }
}
