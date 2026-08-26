package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 点击“立即使用”时用于识别当前微信用户。 */
@Data
public class WechatUsageReq {
    @NotBlank(message = "微信登录code不能为空")
    private String loginCode;
}
