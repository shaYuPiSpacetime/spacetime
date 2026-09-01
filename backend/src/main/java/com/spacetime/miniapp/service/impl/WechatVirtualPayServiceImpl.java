package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.WechatVirtualPayParamsVO;
import com.spacetime.miniapp.service.WechatMiniappClient;
import com.spacetime.miniapp.service.WechatVirtualPayService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.Map;

/**
 * 微信小程序虚拟支付服务实现。
 */
@Slf4j
@Service
public class WechatVirtualPayServiceImpl implements WechatVirtualPayService {

    private static final String API_BASE_URL = "https://api.weixin.qq.com";
    private static final String REQUEST_PAYMENT_URI = "requestVirtualPayment";
    private static final String QUERY_ORDER_URI = "/xpay/query_order";
    private static final String NOTIFY_GOODS_URI = "/xpay/notify_provide_goods";

    private final WechatVirtualPayProperties properties;
    private final WechatMiniappClient wechatMiniappClient;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public WechatVirtualPayServiceImpl(
            WechatVirtualPayProperties properties,
            WechatMiniappClient wechatMiniappClient,
            ObjectMapper objectMapper
    ) {
        this(properties, wechatMiniappClient, objectMapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build());
    }

    WechatVirtualPayServiceImpl(
            WechatVirtualPayProperties properties,
            WechatMiniappClient wechatMiniappClient,
            ObjectMapper objectMapper,
            HttpClient httpClient
    ) {
        this.properties = properties;
        this.wechatMiniappClient = wechatMiniappClient;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    public boolean isEnabled() {
        return properties.isEnabled();
    }

    @Override
    public WechatVirtualPayParamsVO createPayParams(
            String orderNo,
            String productId,
            int goodsPriceFen,
            String sessionKey
    ) {
        assertConfig();
        if (StrUtil.isBlank(orderNo) || orderNo.length() < 8 || orderNo.length() > 32) {
            throw new BusinessException("虚拟支付订单号格式不正确");
        }
        if (StrUtil.isBlank(productId)) {
            throw new BusinessException("虚拟支付商品 ID 不能为空");
        }
        if (goodsPriceFen <= 0) {
            throw new BusinessException("虚拟支付商品价格必须大于 0 分");
        }
        if (StrUtil.isBlank(sessionKey)) {
            throw new BusinessException("微信登录状态已失效，请重试");
        }

        try {
            Map<String, Object> signPayload = new LinkedHashMap<>();
            signPayload.put("offerId", properties.getOfferId());
            signPayload.put("buyQuantity", 1);
            signPayload.put("env", properties.getEnv());
            signPayload.put("currencyType", "CNY");
            signPayload.put("productId", productId);
            signPayload.put("goodsPrice", goodsPriceFen);
            signPayload.put("outTradeNo", orderNo);
            signPayload.put("attach", orderNo);
            String signData = objectMapper.writeValueAsString(signPayload);

            WechatVirtualPayParamsVO result = new WechatVirtualPayParamsVO();
            result.setSignData(signData);
            result.setPaySig(hmacSha256Hex(
                    properties.getAppKey(), REQUEST_PAYMENT_URI + "&" + signData));
            result.setSignature(hmacSha256Hex(sessionKey, signData));
            return result;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("生成微信虚拟支付参数失败", ex);
            throw new BusinessException("生成微信虚拟支付参数失败，请重试");
        }
    }

    @Override
    public VirtualPayOrderResult queryOrder(String openid, String orderNo) {
        assertConfig();
        if (StrUtil.isBlank(openid) || StrUtil.isBlank(orderNo)) {
            throw new BusinessException("虚拟支付查单参数不完整");
        }
        try {
            Map<String, Object> requestPayload = new LinkedHashMap<>();
            requestPayload.put("openid", openid);
            requestPayload.put("env", properties.getEnv());
            requestPayload.put("order_id", orderNo);
            String body = objectMapper.writeValueAsString(requestPayload);
            String paySig = hmacSha256Hex(properties.getAppKey(), QUERY_ORDER_URI + "&" + body);
            String accessToken = wechatMiniappClient.getAccessToken();
            String url = API_BASE_URL + QUERY_ORDER_URI
                    + "?access_token=" + encode(accessToken)
                    + "&pay_sig=" + encode(paySig);
            JsonNode root = sendJsonPost(url, body, "虚拟支付查单");
            JsonNode order = root.path("order");
            return new VirtualPayOrderResult(
                    order.path("order_id").asText(orderNo),
                    order.path("wx_order_id").asText(null),
                    firstNotBlank(
                            order.path("wxpay_order_id").asText(null),
                            order.path("channel_order_id").asText(null),
                            order.path("wx_order_id").asText(null)
                    ),
                    order.path("status").asInt(0),
                    order.path("paid_time").asLong(0),
                    root.toString()
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信虚拟支付查单异常: orderNo={}", orderNo, ex);
            throw new BusinessException("微信虚拟支付查单失败，请重试");
        }
    }

    @Override
    public void notifyProvideGoods(String orderNo, String wxOrderId) {
        assertConfig();
        if (StrUtil.isBlank(orderNo) && StrUtil.isBlank(wxOrderId)) {
            throw new BusinessException("虚拟支付发货参数不完整");
        }
        try {
            Map<String, Object> requestPayload = new LinkedHashMap<>();
            if (StrUtil.isNotBlank(orderNo)) {
                requestPayload.put("order_id", orderNo);
            } else {
                requestPayload.put("wx_order_id", wxOrderId);
            }
            requestPayload.put("env", properties.getEnv());
            String body = objectMapper.writeValueAsString(requestPayload);
            String accessToken = wechatMiniappClient.getAccessToken();
            String url = API_BASE_URL + NOTIFY_GOODS_URI + "?access_token=" + encode(accessToken);
            sendJsonPost(url, body, "虚拟支付发货通知");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信虚拟支付发货通知异常: orderNo={}", orderNo, ex);
            throw new BusinessException("微信虚拟支付发货通知失败，请稍后重试");
        }
    }

    private JsonNode sendJsonPost(String url, String body, String action) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("{} HTTP 失败: status={}", action, response.statusCode());
            throw new BusinessException(action + "失败，请重试");
        }
        if (StrUtil.isBlank(response.body())) {
            return objectMapper.createObjectNode();
        }
        JsonNode root = objectMapper.readTree(response.body());
        int errcode = root.path("errcode").asInt(0);
        if (errcode != 0) {
            log.warn("{}失败: errcode={}", action, errcode);
            throw new BusinessException(action + "失败，请重试");
        }
        return root;
    }

    private void assertConfig() {
        if (!properties.isEnabled()) {
            throw new BusinessException("微信虚拟支付尚未启用");
        }
        if (StrUtil.isBlank(properties.getOfferId())) {
            throw new BusinessException("微信虚拟支付 OfferId 未配置");
        }
        if (StrUtil.isBlank(properties.getAppKey())) {
            throw new BusinessException("微信虚拟支付 AppKey 未配置");
        }
        if (properties.getEnv() != 0 && properties.getEnv() != 1) {
            throw new BusinessException("微信虚拟支付环境配置不正确");
        }
    }

    private String hmacSha256Hex(String key, String content) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BusinessException("微信虚拟支付签名失败");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String firstNotBlank(String... values) {
        for (String value : values) {
            if (StrUtil.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }
}
