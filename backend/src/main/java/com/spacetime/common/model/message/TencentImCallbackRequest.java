package com.spacetime.common.model.message;

/** 腾讯云 TIM 回调地址、查询参数与原始 JSON 请求体。 */
public record TencentImCallbackRequest(
        String callbackPathToken,
        long sdkAppId,
        String callbackCommand,
        long requestTime,
        String sign,
        String optPlatform,
        String body) {
}
