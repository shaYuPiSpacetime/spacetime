package com.spacetime.common.result;

import com.spacetime.common.enums.ResultCodeEnum;
import lombok.Data;

/**
 * 统一返回体，所有 Controller 返回此对象
 * code/msg 使用 ResultCodeEnum 统一管理
 */
@Data
public class R<T> {
    /** 状态码，200 表示成功 */
    private int code;
    /** 提示信息 */
    private String msg;
    /** 返回数据 */
    private T data;

    /** 成功返回（带数据） */
    public static <T> R<T> ok(T data) {
        R<T> r = new R<>();
        r.code = ResultCodeEnum.SUCCESS.getCode();
        r.msg = ResultCodeEnum.SUCCESS.getMsg();
        r.data = data;
        return r;
    }

    /** 成功返回（无数据） */
    public static <T> R<T> ok() {
        return ok(null);
    }

    /** 失败返回（使用 ResultCodeEnum） */
    public static <T> R<T> fail(ResultCodeEnum code) {
        R<T> r = new R<>();
        r.code = code.getCode();
        r.msg = code.getMsg();
        return r;
    }

    /** 失败返回（自定义 code/msg） */
    public static <T> R<T> fail(int code, String msg) {
        R<T> r = new R<>();
        r.code = code;
        r.msg = msg;
        return r;
    }

    /** 失败返回（仅自定义 msg，code 使用 BUSINESS_ERROR） */
    public static <T> R<T> fail(String msg) {
        return fail(ResultCodeEnum.BUSINESS_ERROR.getCode(), msg);
    }
}
