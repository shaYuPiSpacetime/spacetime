package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 匿名推广来源记录请求。
 */
@Data
public class InviteSourceTraceReq {
    @NotBlank(message = "来源类型不能为空")
    @Size(max = 30, message = "来源类型过长")
    private String sourceType;
    @NotBlank(message = "来源令牌不能为空")
    @Size(max = 96, message = "来源令牌过长")
    private String sourceToken;
    @Size(max = 128, message = "访客幂等键过长")
    private String visitorKey;
}
