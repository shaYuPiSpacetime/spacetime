package com.spacetime.common.exception;

import com.spacetime.common.enums.ResultCodeEnum;
import lombok.Getter;

/**
 * 业务异常，由 GlobalExceptionHandler 统一捕获处理
 */
@Getter
public class BusinessException extends RuntimeException {
    /** 错误码 */
    private final int code;

    /** 使用 ResultCodeEnum 构造 */
    public BusinessException(ResultCodeEnum code) {
        super(code.getMsg());
        this.code = code.getCode();
    }

    /** 自定义 code 和 msg */
    public BusinessException(int code, String msg) {
        super(msg);
        this.code = code;
    }

    /** 仅自定义 msg，code 默认 BUSINESS_ERROR */
    public BusinessException(String msg) {
        this(ResultCodeEnum.BUSINESS_ERROR.getCode(), msg);
    }
}
