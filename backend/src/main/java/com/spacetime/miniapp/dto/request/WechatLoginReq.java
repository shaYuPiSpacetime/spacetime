package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import jakarta.validation.constraints.Size;

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

    /** 注册前记录的推广来源追踪号，服务端最终做来源优先级判断。 */
    @Size(max = 10, message = "推广来源数量不能超过10个")
    private List<@NotBlank(message = "推广来源追踪号不能为空")
            @Size(max = 64, message = "推广来源追踪号长度不能超过64个字符") String> promotionTraceNos;
}
