package com.spacetime.miniapp.controller;

import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/** 微信图片、音频内容安全异步回调入口。 */
@RestController
@RequestMapping("/miniapp/content-security/wechat")
@RequiredArgsConstructor
public class CommunityMediaAuditCallbackController {
    private final CommunityMediaAuditCallbackService callbackService;

    @GetMapping("/callback")
    public String verifyUrl(@RequestParam String signature,
                            @RequestParam String timestamp,
                            @RequestParam String nonce,
                            @RequestParam("echostr") String echoString) {
        return callbackService.verifyUrl(signature, timestamp, nonce, echoString);
    }

    @PostMapping(value = "/callback", consumes = {MediaType.APPLICATION_JSON_VALUE,
            MediaType.APPLICATION_XML_VALUE, MediaType.TEXT_XML_VALUE})
    public String callback(@RequestParam String signature,
                           @RequestParam String timestamp,
                           @RequestParam String nonce,
                           @RequestHeader(value = "Content-Type", required = false) String contentType,
                           @RequestBody String payload) {
        callbackService.handleRaw(signature, timestamp, nonce, contentType, payload);
        return "success";
    }
}
