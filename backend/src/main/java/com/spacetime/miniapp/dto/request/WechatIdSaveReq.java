package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 微信号保存请求。 */
@Data
public class WechatIdSaveReq {
    /** 微信号，仅作为私密联系方式保存。 */
    @NotBlank(message = "微信号不能为空")
    private String wechatId;
}
