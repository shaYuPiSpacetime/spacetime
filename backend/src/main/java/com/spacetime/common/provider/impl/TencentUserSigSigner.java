package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spacetime.common.provider.InstantMessageException;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Base64;
import java.util.zip.Deflater;

/** 腾讯云官方 HMAC-SHA256 UserSig v2 算法的无第三方依赖实现。 */
@Component
public class TencentUserSigSigner {
    private final ObjectMapper objectMapper;

    public TencentUserSigSigner(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String generate(long sdkAppId, String userId, String secretKey,
                           long expireSeconds, long issuedAtEpochSeconds) {
        requireInputs(sdkAppId, userId, secretKey, expireSeconds);
        String content = "TLS.identifier:" + userId + "\n"
                + "TLS.sdkappid:" + sdkAppId + "\n"
                + "TLS.time:" + issuedAtEpochSeconds + "\n"
                + "TLS.expire:" + expireSeconds + "\n";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String signature = Base64.getEncoder().encodeToString(
                    mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("TLS.ver", "2.0");
            payload.put("TLS.identifier", userId);
            payload.put("TLS.sdkappid", sdkAppId);
            payload.put("TLS.expire", expireSeconds);
            payload.put("TLS.time", issuedAtEpochSeconds);
            payload.put("TLS.sig", signature);
            return compress(objectMapper.writeValueAsBytes(payload));
        } catch (GeneralSecurityException | JsonProcessingException ex) {
            throw new InstantMessageException("TIM_USERSIG_GENERATE_FAILED",
                    "腾讯云TIM登录凭证生成失败", false);
        }
    }

    private String compress(byte[] source) {
        Deflater deflater = new Deflater();
        try {
            deflater.setInput(source);
            deflater.finish();
            byte[] buffer = new byte[Math.max(2048, source.length * 2)];
            int length = deflater.deflate(buffer);
            byte[] encoded = Base64.getEncoder().encode(Arrays.copyOf(buffer, length));
            for (int i = 0; i < encoded.length; i++) {
                if (encoded[i] == '+') encoded[i] = '*';
                else if (encoded[i] == '/') encoded[i] = '-';
                else if (encoded[i] == '=') encoded[i] = '_';
            }
            return new String(encoded, StandardCharsets.US_ASCII);
        } finally {
            deflater.end();
        }
    }

    private void requireInputs(long sdkAppId, String userId, String secretKey, long expireSeconds) {
        if (sdkAppId <= 0 || userId == null || userId.isBlank() || userId.length() > 32
                || secretKey == null || secretKey.isBlank() || expireSeconds <= 0) {
            throw new InstantMessageException("TIM_USERSIG_CONFIG_INVALID",
                    "腾讯云TIM登录凭证配置无效", false);
        }
    }
}
