package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信授权登录请求
 */
@Data
public class WechatLoginReq {
    /** 微信小程序 wx.login() 返回的临时 code */
    @NotBlank(message = "微信code不能为空")
    private String code;
}
