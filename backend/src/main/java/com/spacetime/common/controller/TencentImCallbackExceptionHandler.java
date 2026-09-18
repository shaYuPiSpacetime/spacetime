package com.spacetime.common.controller;

import com.spacetime.common.model.message.TencentImCallbackResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** 确保控制器参数绑定失败时仍按腾讯回调协议应答，而不是平台通用 R。 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = TencentImCallbackController.class)
public class TencentImCallbackExceptionHandler {

    @ExceptionHandler({MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class})
    public TencentImCallbackResponse handleBadRequest(Exception exception) {
        log.warn("TIM callback request binding failed: {}", exception.getClass().getSimpleName());
        return TencentImCallbackResponse.fail(1, "callback request invalid");
    }
}
