package com.spacetime.common.service;

import com.spacetime.common.model.message.TencentImCallbackRequest;
import com.spacetime.common.model.message.TencentImCallbackResponse;

/** 腾讯云 TIM 消息发送前、发送后回调处理。 */
public interface TencentImCallbackService {
    TencentImCallbackResponse handle(TencentImCallbackRequest request);
}
