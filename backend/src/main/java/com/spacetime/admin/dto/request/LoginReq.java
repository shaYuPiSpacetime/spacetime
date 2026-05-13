package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录请求
 */
@Data
public class LoginReq {
    /** 登录账号（用户名或手机号） */
    @NotBlank(message = "账号不能为空")
    private String account;
    /** 密码 */
    @NotBlank(message = "密码不能为空")
    private String password;
    /** 验证码（暂未启用） */
    private String captcha;
}
