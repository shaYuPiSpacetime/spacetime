package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 点击“立即使用”时用于识别当前微信用户。 */
@Data
public class WechatUsageReq {
    @NotBlank(message = "微信登录code不能为空")
    private String loginCode;

    /** 首次建号前采集的推广来源，服务端统一进行注册归因。 */
    @Size(max = 10, message = "推广来源数量不能超过10个")
    private List<@NotBlank(message = "推广来源追踪号不能为空")
            @Size(max = 64, message = "推广来源追踪号长度不能超过64个字符") String> promotionTraceNos;
}
