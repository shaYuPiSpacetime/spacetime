package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信登录请求。
 */
@Data
public class WechatLoginReq {
    /** 兼容旧字段：wx.login 返回的临时 code。 */
    private String code;

    /** wx.login 返回的临时 code。 */
    private String loginCode;

    /** Button open-type=getPhoneNumber 返回的手机号授权 code。 */
    @NotBlank(message = "微信手机号授权code不能为空")
    private String phoneCode;

    /** 微信加密数据，当前 mock 登录暂不解析，后续接真实微信接口时使用。 */
    private String encryptedData;

    /** 微信加密数据初始向量，当前 mock 登录暂不解析。 */
    private String iv;

    /** 是否已勾选登录协议；未勾选时后端拒绝登录。 */
    private Boolean agreeProtocol;
}
