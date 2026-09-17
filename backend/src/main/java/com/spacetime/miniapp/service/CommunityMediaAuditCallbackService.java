package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.JsonNode;

/** 微信图片、音频异步内容安全回调。 */
public interface CommunityMediaAuditCallbackService {
    String verifyUrl(String signature, String timestamp, String nonce, String echoString);
    /** 分流前复用原有的微信签名校验。 */
    void validateSignature(String signature, String timestamp, String nonce);
    void handle(String signature, String timestamp, String nonce, JsonNode payload);
    void handleRaw(String signature, String timestamp, String nonce, String contentType, String payload);
}
