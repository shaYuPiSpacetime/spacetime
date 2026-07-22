package com.spacetime.common.exception;

/** 已登录但无权访问敏感字段或筛选条件。 */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
