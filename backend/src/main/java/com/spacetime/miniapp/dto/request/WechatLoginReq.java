package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信登录请求。
 */
@Data
public class WechatLoginReq {
    /** wx.login 返回的临时 code。 */
    private String loginCode;

    /** Button open-type=getPhoneNumber 返回的手机号授权 code。 */
    @NotBlank(message = "微信手机号授权code不能为空")
    private String phoneCode;

    /** 是否已勾选登录协议；未勾选时后端拒绝登录。 */
    private Boolean agreeProtocol;
}
