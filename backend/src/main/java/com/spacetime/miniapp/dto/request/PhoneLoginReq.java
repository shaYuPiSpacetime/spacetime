package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 手机号登录请求。
 */
@Data
public class PhoneLoginReq {
    /** 中国大陆手机号，用于登录和后续实名绑定提示。 */
    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    /** 短信验证码；必须先调用 /miniapp/auth/sms-code 获取。 */
    @NotBlank(message = "验证码不能为空")
    private String smsCode;

    /** 是否已勾选登录协议；未勾选时后端拒绝登录。 */
    @NotNull(message = "请先勾选协议")
    private Boolean agreeProtocol;
}
