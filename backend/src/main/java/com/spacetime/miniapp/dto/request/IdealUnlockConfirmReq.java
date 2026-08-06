package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 理想型解锁确认扣币请求。 */
@Data
public class IdealUnlockConfirmReq {
    @NotBlank(message = "解锁请求幂等键不能为空")
    private String requestId;
    @NotBlank(message = "报价令牌不能为空")
    private String quoteToken;
}
