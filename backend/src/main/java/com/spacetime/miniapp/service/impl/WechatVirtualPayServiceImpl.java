package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundQueryMismatchException;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundRequestRejectedException;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundRequestUnknownException;
import com.spacetime.common.service.WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot;
import com.spacetime.common.service.WechatVirtualRefundGateway.VirtualRefundQueryResult;
import com.spacetime.common.service.WechatVirtualRefundGateway.VirtualRefundRequestResult;
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
    private static final String REFUND_ORDER_URI = "/xpay/refund_order";
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
            JsonNode root = queryOrderPayload(openid, orderNo);
            JsonNode order = requireMatchingOrder(root, orderNo, "虚拟支付原支付单查单");
            return new VirtualPayOrderResult(
                    order.path("order_id").asText(),
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

    @Override
    public VirtualPaymentOrderSnapshot queryPaymentOrder(String openid, String orderNo) {
        assertConfig();
        if (StrUtil.isBlank(openid) || StrUtil.isBlank(orderNo)) {
            throw new BusinessException("虚拟支付原支付单查单参数不完整");
        }
        try {
            JsonNode root = queryOrderPayload(openid, orderNo);
            JsonNode order = requireMatchingOrder(root, orderNo, "虚拟支付原支付单查单");
            return new VirtualPaymentOrderSnapshot(
                    order.path("status").asInt(0),
                    order.path("left_fee").asInt(0),
                    root.toString()
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信虚拟支付原支付单查单异常: orderNo={}", orderNo, ex);
            throw new BusinessException("微信虚拟支付原支付单查单失败，请重试");
        }
    }

    @Override
    public VirtualRefundRequestResult requestRefund(
            String openid,
            String payOrderNo,
            String refundOrderNo,
            int leftFeeFen,
            int refundFeeFen,
            String bizMeta
    ) {
        try {
            assertConfig();
            validateRefundRequest(openid, payOrderNo, refundOrderNo, leftFeeFen, refundFeeFen, bizMeta);
        } catch (RefundRequestRejectedException exception) {
            throw exception;
        } catch (BusinessException exception) {
            // 配置或本地参数校验发生在 HTTP 请求前，可以确定渠道未受理。
            throw new RefundRequestRejectedException(exception.getMessage());
        }
        try {
            Map<String, Object> requestPayload = new LinkedHashMap<>();
            requestPayload.put("openid", openid);
            requestPayload.put("order_id", payOrderNo);
            requestPayload.put("refund_order_id", refundOrderNo);
            requestPayload.put("left_fee", leftFeeFen);
            requestPayload.put("refund_fee", refundFeeFen);
            requestPayload.put("biz_meta", StrUtil.blankToDefault(bizMeta, ""));
            requestPayload.put("refund_reason", "5");
            requestPayload.put("req_from", "1");
            requestPayload.put("env", properties.getEnv());
            String body = objectMapper.writeValueAsString(requestPayload);
            String paySig = hmacSha256Hex(properties.getAppKey(), REFUND_ORDER_URI + "&" + body);
            String accessToken = wechatMiniappClient.getAccessToken();
            String url = API_BASE_URL + REFUND_ORDER_URI
                    + "?access_token=" + encode(accessToken)
                    + "&pay_sig=" + encode(paySig);
            JsonNode root = sendRefundRequestJsonPost(url, body);
            String responseRefundOrderNo = root.path("refund_order_id").asText(null);
            if (StrUtil.isBlank(responseRefundOrderNo)
                    || !refundOrderNo.equals(responseRefundOrderNo)) {
                throw new RefundRequestUnknownException("微信虚拟支付退款受理响应单号不一致，请查单确认");
            }
            String responsePayOrderNo = root.path("pay_order_id").asText(null);
            if (StrUtil.isNotBlank(responsePayOrderNo)
                    && !payOrderNo.equals(responsePayOrderNo)) {
                throw new RefundRequestUnknownException("微信虚拟支付退款受理响应原订单号不一致，请查单确认");
            }
            return new VirtualRefundRequestResult(
                    responseRefundOrderNo,
                    root.path("refund_wx_order_id").asText(null),
                    StrUtil.blankToDefault(responsePayOrderNo, payOrderNo),
                    root.path("pay_wx_order_id").asText(null),
                    root.toString()
            );
        } catch (RefundRequestRejectedException | RefundRequestUnknownException ex) {
            throw ex;
        } catch (BusinessException ex) {
            throw new RefundRequestRejectedException(ex.getMessage());
        } catch (Exception ex) {
            log.error("微信虚拟支付退款申请异常: orderNo={}, refundNo={}", payOrderNo, refundOrderNo, ex);
            throw new RefundRequestRejectedException("微信虚拟支付退款申请未发出，请检查配置后重试");
        }
    }

    @Override
    public VirtualRefundQueryResult queryRefund(String openid, String refundOrderNo) {
        assertConfig();
        if (StrUtil.isBlank(openid) || StrUtil.isBlank(refundOrderNo)) {
            throw new BusinessException("虚拟支付退款查单参数不完整");
        }
        try {
            JsonNode root = queryOrderPayload(openid, refundOrderNo);
            JsonNode order = requireMatchingOrder(root, refundOrderNo, "虚拟支付退款查单");
            return new VirtualRefundQueryResult(
                    order.path("order_id").asText(),
                    order.path("wx_order_id").asText(null),
                    order.path("status").asInt(0),
                    order.path("order_type").asInt(0),
                    order.path("refund_fee").asInt(0),
                    order.path("paid_time").asLong(0),
                    root.toString()
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信虚拟支付退款查单异常: refundNo={}", refundOrderNo, ex);
            throw new BusinessException("微信虚拟支付退款查单失败，请重试");
        }
    }

    private JsonNode queryOrderPayload(String openid, String orderNo) throws Exception {
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
        return sendJsonPost(url, body, "虚拟支付查单");
    }

    private void validateRefundRequest(
            String openid,
            String payOrderNo,
            String refundOrderNo,
            int leftFeeFen,
            int refundFeeFen,
            String bizMeta
    ) {
        if (StrUtil.isBlank(openid) || StrUtil.isBlank(payOrderNo)) {
            throw new BusinessException("虚拟支付退款支付单参数不完整");
        }
        if (StrUtil.isBlank(refundOrderNo)
                || refundOrderNo.length() < 8
                || refundOrderNo.length() > 32
                || !refundOrderNo.matches("[A-Za-z0-9_-]+")) {
            throw new BusinessException("虚拟支付退款单号格式不正确");
        }
        if (leftFeeFen <= 0 || refundFeeFen <= 0 || refundFeeFen != leftFeeFen) {
            throw new RefundRequestRejectedException("虚拟支付仅支持按渠道剩余金额全额退款");
        }
        if (bizMeta != null && bizMeta.length() > 1024) {
            throw new BusinessException("虚拟支付退款业务信息过长");
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

    /**
     * 发起退款的 HTTP 边界需要区分“微信明确拒绝”和“结果未知”。
     * 前者可以安全恢复本地订单，后者必须保留退款中状态并使用同一退款单号查单。
     */
    private JsonNode sendRefundRequestJsonPost(String url, String body) {
        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
        } catch (RuntimeException exception) {
            throw new RefundRequestRejectedException("微信虚拟支付退款请求参数无效");
        }

        HttpResponse<String> response;
        try {
            response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new RefundRequestUnknownException("微信虚拟支付退款申请被中断，请查单确认");
        } catch (Exception exception) {
            log.warn("微信虚拟支付退款申请传输异常，需查单确认", exception);
            throw new RefundRequestUnknownException("微信虚拟支付退款申请结果未知，请查单确认");
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("微信虚拟支付退款申请 HTTP 响应异常: status={}", response.statusCode());
            throw new RefundRequestUnknownException("微信虚拟支付退款申请响应异常，请查单确认");
        }
        if (StrUtil.isBlank(response.body())) {
            throw new RefundRequestUnknownException("微信虚拟支付退款申请响应为空，请查单确认");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(response.body());
        } catch (Exception exception) {
            throw new RefundRequestUnknownException("微信虚拟支付退款申请响应无法解析，请查单确认");
        }
        boolean hasErrcode = root != null
                && root.has("errcode")
                && root.path("errcode").canConvertToInt();
        if (hasErrcode && root.path("errcode").asInt() != 0) {
            int errcode = root.path("errcode").asInt();
            log.warn("微信虚拟支付退款申请被拒绝: errcode={}", errcode);
            throw new RefundRequestRejectedException("微信虚拟支付退款申请被拒绝，请核对后重试");
        }
        if (!hasErrcode) {
            throw new RefundRequestUnknownException("微信虚拟支付退款申请响应缺少结果码，请查单确认");
        }
        return root;
    }

    /**
     * 查单结果必须明确携带请求对应的商户单号，禁止用请求值兜底伪造匹配。
     */
    private JsonNode requireMatchingOrder(JsonNode root, String expectedOrderNo, String action) {
        String rawPayload = root == null ? null : root.toString();
        if (root == null || !root.hasNonNull("order") || !root.path("order").isObject()) {
            throw new RefundQueryMismatchException(action + "响应缺少 order 节点，请人工复核", rawPayload);
        }
        JsonNode order = root.path("order");
        String actualOrderNo = order.path("order_id").asText(null);
        if (StrUtil.isBlank(actualOrderNo)) {
            throw new RefundQueryMismatchException(action + "响应缺少 order_id，请人工复核", rawPayload);
        }
        if (!expectedOrderNo.equals(actualOrderNo)) {
            throw new RefundQueryMismatchException(action + "响应 order_id 不匹配，请人工复核", rawPayload);
        }
        return order;
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
