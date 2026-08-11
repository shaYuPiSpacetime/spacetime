package com.spacetime.common.provider.impl;

/** 腾讯云 TIM REST 原始响应。 */
public record TencentImHttpResponse(int statusCode, String body) {
}
