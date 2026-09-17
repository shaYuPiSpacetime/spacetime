package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import com.spacetime.miniapp.service.WechatMessagePushRouterService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** 微信消息推送入口：内容安全异步回调与原生客服消息共用。 */
@RestController
@RequestMapping("/miniapp/content-security/wechat")
@RequiredArgsConstructor
@Slf4j
public class CommunityMediaAuditCallbackController {
    private final CommunityMediaAuditCallbackService callbackService;
    private final WechatMessagePushRouterService messagePushRouterService;

    @GetMapping("/callback")
    public String verifyUrl(@RequestParam String signature,
                            @RequestParam String timestamp,
                            @RequestParam String nonce,
                            @RequestParam("echostr") String echoString) {
        return callbackService.verifyUrl(signature, timestamp, nonce, echoString);
    }

    @PostMapping(value = "/callback", consumes = {MediaType.APPLICATION_JSON_VALUE,
            MediaType.APPLICATION_XML_VALUE, MediaType.TEXT_XML_VALUE, MediaType.TEXT_PLAIN_VALUE})
    public ResponseEntity<String> callback(@RequestParam String signature,
                                           @RequestParam String timestamp,
                                           @RequestParam String nonce,
                                           @RequestHeader(value = "Content-Type", required = false) String contentType,
                                           HttpServletRequest request) throws IOException {
        callbackService.validateSignature(signature, timestamp, nonce);
        byte[] body = request.getInputStream().readNBytes(WechatMessagePushRouterService.MAX_CALLBACK_BODY_BYTES + 1);
        if (body.length > WechatMessagePushRouterService.MAX_CALLBACK_BODY_BYTES) {
            throw new BusinessException(4001, "wechat_callback_payload_too_large");
        }
        String payload = new String(body, StandardCharsets.UTF_8);
        String reply = messagePushRouterService.route(signature, timestamp, nonce, contentType, payload);
        MediaType replyType = "success".equals(reply) ? MediaType.TEXT_PLAIN
                : contentType != null && contentType.toLowerCase(java.util.Locale.ROOT).contains("xml")
                ? MediaType.APPLICATION_XML : MediaType.APPLICATION_JSON;
        return ResponseEntity.ok().contentType(replyType).body(reply);
    }

    /** 微信回调需要真实 HTTP 错误状态，不能使用通用业务 JSON 包装。 */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<String> callbackBusinessError(BusinessException ex) {
        HttpStatus status = ex.getCode() == 403 ? HttpStatus.FORBIDDEN
                : ex.getCode() == 4001 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
        log.warn("wechat message push rejected: httpStatus={}, code={}", status.value(), ex.getCode());
        return ResponseEntity.status(status).contentType(MediaType.TEXT_PLAIN).body("fail");
    }

    /** 未预期错误同样不能以 HTTP 200 告知微信已处理成功。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> callbackUnexpectedError(Exception ex) {
        log.error("wechat message push failed: exceptionType={}", ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.TEXT_PLAIN).body("fail");
    }
}
