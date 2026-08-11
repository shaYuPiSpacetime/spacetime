package com.spacetime.common.model.message;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 腾讯云 TIM 回调协议响应，不使用平台通用 R 包装。 */
public record TencentImCallbackResponse(
        @JsonProperty("ActionStatus") String actionStatus,
        @JsonProperty("ErrorCode") int errorCode,
        @JsonProperty("ErrorInfo") String errorInfo) {

    public static TencentImCallbackResponse ok() {
        return new TencentImCallbackResponse("OK", 0, "OK");
    }

    public static TencentImCallbackResponse fail(int errorCode, String errorInfo) {
        return new TencentImCallbackResponse("FAIL", errorCode, errorInfo);
    }
}
