package com.spacetime.common.exception;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.result.R;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * 全局异常处理器
 * BusinessException → 返回业务错误码和 msg
 * 其他 Exception → 生成 requestId 并记录日志，方便排查
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String REQUEST_ID_KEY = "requestId";

    /** 业务异常：直接返回异常中的 code 和 msg */
    @ExceptionHandler(BusinessException.class)
    public R<Void> handleBusinessException(BusinessException e) {
        log.warn("business error: {}", e.getMessage());
        return R.fail(e.getCode(), e.getMessage());
    }

    /** 参数校验失败：返回具体字段和错误信息 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public R<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("validation error: {}", message);
        return R.fail(ResultCodeEnum.PARAM_ERROR.getCode(), message);
    }

    /** 未知异常：生成 requestId 并打印完整堆栈，方便排查 */
    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        String requestId = IdUtil.simpleUUID();
        MDC.put(REQUEST_ID_KEY, requestId);
        log.error("system error, requestId: {}", requestId, e);
        return R.fail(ResultCodeEnum.SYSTEM_ERROR.getCode(),
                "系统异常，请联系管理员，请求ID: " + requestId);
    }
}
