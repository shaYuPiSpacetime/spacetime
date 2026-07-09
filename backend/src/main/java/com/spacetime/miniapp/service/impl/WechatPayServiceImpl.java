package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatPayProperties;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.WechatPayParamsVO;
import com.spacetime.miniapp.service.WechatPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * 微信支付服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatPayServiceImpl implements WechatPayService {

    private static final String JSAPI_URL = "https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi";
    private static final String JSAPI_PATH = "/v3/pay/transactions/jsapi";

    private final WechatPayProperties properties;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Override
    public WechatPayParamsVO createJsapiPayParams(TradeOrder order, String openid) {
        assertPayConfig();
        if (openid == null || openid.isBlank()) {
            throw new BusinessException("当前用户缺少微信 openid，无法发起支付");
        }

        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "appid", properties.getAppId(),
                    "mchid", properties.getMchId(),
                    "description", buildDescription(order),
                    "out_trade_no", order.getOrderNo(),
                    "notify_url", properties.getNotifyUrl(),
                    "amount", Map.of(
                            "total", toCents(order.getPayAmount()),
                            "currency", "CNY"
                    ),
                    "payer", Map.of("openid", openid)
            ));
            String timestamp = String.valueOf(Instant.now().getEpochSecond());
            String nonce = nonce();
            String authorization = buildAuthorization("POST", JSAPI_PATH, timestamp, nonce, body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(JSAPI_URL))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", authorization)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("微信 JSAPI 下单失败: status={}, body={}", response.statusCode(), response.body());
                throw new BusinessException("微信支付下单失败，请稍后重试");
            }
            String prepayId = objectMapper.readTree(response.body()).path("prepay_id").asText();
            if (prepayId.isBlank()) {
                throw new BusinessException("微信支付预支付参数缺失");
            }
            return buildRequestPaymentParams(prepayId);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信 JSAPI 下单异常: orderNo={}", order.getOrderNo(), ex);
            throw new BusinessException("微信支付下单失败，请稍后重试");
        }
    }

    @Override
    public WechatPayNotifyResult parseNotify(String body) {
        assertPayConfig();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (root.hasNonNull("out_trade_no")) {
                return directNotifyResult(root, body);
            }

            JsonNode resource = root.path("resource");
            if (resource.isMissingNode()) {
                throw new BusinessException("微信支付回调缺少 resource");
            }
            String decryptedPayload = decryptResource(
                    resource.path("ciphertext").asText(),
                    resource.path("nonce").asText(),
                    resource.path("associated_data").asText("")
            );
            JsonNode trade = objectMapper.readTree(decryptedPayload);
            return new WechatPayNotifyResult(
                    trade.path("out_trade_no").asText(),
                    trade.path("transaction_id").asText(),
                    trade.path("trade_state").asText(),
                    decryptedPayload
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("微信支付回调解析失败", ex);
            throw new BusinessException("微信支付回调解析失败");
        }
    }

    private WechatPayNotifyResult directNotifyResult(JsonNode root, String body) {
        return new WechatPayNotifyResult(
                root.path("out_trade_no").asText(),
                root.path("transaction_id").asText(),
                root.path("trade_state").asText("SUCCESS"),
                body
        );
    }

    private WechatPayParamsVO buildRequestPaymentParams(String prepayId) throws Exception {
        String timeStamp = String.valueOf(Instant.now().getEpochSecond());
        String nonceStr = nonce();
        String packageValue = "prepay_id=" + prepayId;
        String paySign = sign(properties.getAppId() + "\n" + timeStamp + "\n" + nonceStr + "\n" + packageValue + "\n");

        WechatPayParamsVO vo = new WechatPayParamsVO();
        vo.setTimeStamp(timeStamp);
        vo.setNonceStr(nonceStr);
        vo.setPackageValue(packageValue);
        vo.setSignType("RSA");
        vo.setPaySign(paySign);
        vo.setPrepayId(prepayId);
        return vo;
    }

    private String buildAuthorization(String method, String path, String timestamp, String nonce, String body) throws Exception {
        String signatureMessage = method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body + "\n";
        String signature = sign(signatureMessage);
        return "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + properties.getMchId() + "\","
                + "nonce_str=\"" + nonce + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + properties.getCertSerialNo() + "\","
                + "signature=\"" + signature + "\"";
    }

    private String sign(String message) throws Exception {
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(loadPrivateKey());
        signature.update(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature.sign());
    }

    private PrivateKey loadPrivateKey() throws Exception {
        String pem = readConfiguredFile(properties.getPrivateKeyPath());
        String content = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(content);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(keyBytes);
        return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
    }

    private String readConfiguredFile(String configuredPath) throws Exception {
        if (configuredPath == null || configuredPath.isBlank()) {
            throw new BusinessException("微信支付证书路径未配置");
        }
        if (configuredPath.startsWith("classpath:")) {
            Resource resource = resourceLoader.getResource(configuredPath);
            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }
        return Files.readString(Path.of(configuredPath), StandardCharsets.UTF_8);
    }

    private String decryptResource(String ciphertext, String nonce, String associatedData) throws Exception {
        byte[] apiV3KeyBytes = properties.getApiV3Key().getBytes(StandardCharsets.UTF_8);
        if (apiV3KeyBytes.length != 32) {
            throw new BusinessException("微信支付 API v3 密钥长度不正确");
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec key = new SecretKeySpec(apiV3KeyBytes, "AES");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, nonce.getBytes(StandardCharsets.UTF_8)));
        if (associatedData != null && !associatedData.isBlank()) {
            cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
        }
        byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(ciphertext));
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    private String buildDescription(TradeOrder order) {
        String packageName = order.getPackageName() == null ? "会员服务" : order.getPackageName();
        return properties.getDescriptionPrefix() + "-" + packageName;
    }

    private int toCents(BigDecimal amount) {
        return amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).intValueExact();
    }

    private String nonce() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void assertPayConfig() {
        if (isBlank(properties.getAppId())
                || isBlank(properties.getMchId())
                || isBlank(properties.getApiV3Key())
                || isBlank(properties.getCertSerialNo())
                || isBlank(properties.getPrivateKeyPath())
                || isBlank(properties.getNotifyUrl())) {
            throw new BusinessException("微信支付配置不完整");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
