package com.spacetime.common.controller;

import com.spacetime.common.model.message.TencentImCallbackRequest;
import com.spacetime.common.model.message.TencentImCallbackResponse;
import com.spacetime.common.service.TencentImCallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 腾讯云 TIM 服务端回调入口。 */
@RestController
@RequestMapping("/internal/tencent-im")
@RequiredArgsConstructor
public class TencentImCallbackController {
    private final TencentImCallbackService callbackService;

    @PostMapping(value = "/callback/{callbackPathToken}", consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public TencentImCallbackResponse callback(
            @PathVariable String callbackPathToken,
            @RequestParam("SdkAppid") long sdkAppId,
            @RequestParam("CallbackCommand") String callbackCommand,
            @RequestParam("RequestTime") long requestTime,
            @RequestParam("Sign") String sign,
            @RequestParam(value = "OptPlatform", required = false) String optPlatform,
            @RequestBody String body) {
        return callbackService.handle(new TencentImCallbackRequest(
                callbackPathToken, sdkAppId, callbackCommand, requestTime, sign, optPlatform, body));
    }
}
