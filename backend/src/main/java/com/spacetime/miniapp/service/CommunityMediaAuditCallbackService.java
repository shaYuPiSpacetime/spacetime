package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.JsonNode;

/** 微信图片异步内容安全回调。 */
public interface CommunityMediaAuditCallbackService {
    String verifyUrl(String signature, String timestamp, String nonce, String echoString);
    void handle(String signature, String timestamp, String nonce, JsonNode payload);
    void handleRaw(String signature, String timestamp, String nonce, String contentType, String payload);
}
