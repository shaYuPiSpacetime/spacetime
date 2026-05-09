package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 统一错误码枚举
 * 200：成功，4xxx：客户端错误，5xxx：服务端错误
 */
@Getter
public enum ResultCodeEnum {
    SUCCESS(200, "success"),
    /** 未登录或 token 已过期 */
    UNAUTHORIZED(401, "未登录或登录已过期"),
    /** 已登录但无权限访问 */
    FORBIDDEN(403, "无权限"),
    /** 请求的资源不存在 */
    NOT_FOUND(404, "资源不存在"),
    /** 请求参数校验失败 */
    PARAM_ERROR(4001, "参数错误"),
    /** 业务逻辑异常 */
    BUSINESS_ERROR(5001, "业务异常"),
    /** 未知系统异常 */
    SYSTEM_ERROR(5000, "系统异常");

    private final int code;
    private final String msg;

    ResultCodeEnum(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
