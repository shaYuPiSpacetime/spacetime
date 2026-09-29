package com.spacetime.common.exception;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.result.R;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
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
    private static final Map<String, String> VALIDATION_FIELD_LABELS = Map.ofEntries(
            Map.entry("nickname", "昵称"),
            Map.entry("gender", "性别"),
            Map.entry("birthday", "出生日期"),
            Map.entry("age", "年龄"),
            Map.entry("height", "身高"),
            Map.entry("weight", "体重"),
            Map.entry("identity", "身份"),
            Map.entry("educationLevel", "学历"),
            Map.entry("industry", "行业"),
            Map.entry("occupation", "职业"),
            Map.entry("annualIncome", "年收入"),
            Map.entry("maritalStatus", "婚姻状况"),
            Map.entry("locationProvince", "现居省份"),
            Map.entry("locationCity", "现居城市"),
            Map.entry("locationDistrict", "现居区县"),
            Map.entry("hometownProvince", "家乡省份"),
            Map.entry("hometownCity", "家乡城市"),
            Map.entry("hometownDistrict", "家乡区县"),
            Map.entry("school", "学校"),
            Map.entry("schoolCode", "学校"),
            Map.entry("major", "专业"),
            Map.entry("avatarSource", "头像来源"),
            Map.entry("avatarUrl", "头像"),
            Map.entry("page", "页码"),
            Map.entry("size", "每页数量"),
            Map.entry("targetUserId", "目标用户"),
            Map.entry("requestId", "请求标识"),
            Map.entry("sourceScene", "来源场景"),
            Map.entry("content", "内容"),
            Map.entry("reasonCode", "举报原因"),
            Map.entry("phoneNumber", "手机号")
    );

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
                .map(fe -> fieldLabel(fe.getField()) + "：" + validationMessage(fe.getDefaultMessage()))
                .collect(Collectors.joining("，"));
        log.warn("validation error: {}", message);
        return R.fail(ResultCodeEnum.PARAM_ERROR.getCode(), message);
    }

    /** 查询参数绑定或校验失败。 */
    @ExceptionHandler(BindException.class)
    public R<Void> handleBindException(BindException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fieldLabel(fe.getField()) + "：" + validationMessage(fe.getDefaultMessage()))
                .collect(Collectors.joining("，"));
        log.warn("binding error: {}", message);
        return R.fail(ResultCodeEnum.PARAM_ERROR.getCode(), message);
    }

    /** 路径或查询参数类型错误，例如把 page 传成非数字。 */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public R<Void> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException e) {
        String message = fieldLabel(e.getName()) + "：参数格式不正确";
        log.warn("argument type mismatch: {}", message);
        return R.fail(ResultCodeEnum.PARAM_ERROR.getCode(), message);
    }

    /** 资源不存在：接口路径或静态资源路径错误时返回 404，不按系统异常处理。 */
    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public R<Void> handleNotFound(Exception e) {
        log.warn("resource not found: {}", e.getMessage());
        return R.fail(ResultCodeEnum.NOT_FOUND);
    }

    /** 已登录但无权限：同时返回 HTTP 403 和统一业务体。 */
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<R<Void>> handleForbiddenException(ForbiddenException e) {
        log.warn("forbidden: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(R.fail(ResultCodeEnum.FORBIDDEN.getCode(), e.getMessage()));
    }

    /** 未知异常：生成 requestId 并打印完整堆栈，方便排查。 */
    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        String requestId = IdUtil.simpleUUID();
        MDC.put(REQUEST_ID_KEY, requestId);
        log.error("system error, requestId: {}", requestId, e);
        return R.fail(ResultCodeEnum.SYSTEM_ERROR.getCode(),
                "系统异常，请联系管理员，请求ID: " + requestId);
    }

    private String fieldLabel(String field) {
        if (field == null || field.isBlank()) {
            return "参数";
        }
        int separator = Math.max(field.lastIndexOf('.'), field.lastIndexOf(']'));
        String simpleField = separator >= 0 && separator + 1 < field.length()
                ? field.substring(separator + 1) : field;
        return VALIDATION_FIELD_LABELS.getOrDefault(simpleField, "参数");
    }

    private String validationMessage(String message) {
        return message == null || message.isBlank() ? "参数不正确" : message;
    }
}
