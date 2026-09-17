package com.spacetime.miniapp.service;

/** 微信小程序消息推送分流：审核回调与原生客服消息共用接收地址。 */
public interface WechatMessagePushRouterService {
    int MAX_CALLBACK_BODY_BYTES = 1024 * 1024;

    /** 验签并处理微信推送，返回微信协议要求的原始响应体。 */
    String route(String signature, String timestamp, String nonce, String contentType, String payload);
}
