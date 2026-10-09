package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 喜欢或访客单条解锁确认请求。 */
@Data
public class RelationUnlockConfirmReq {
    /** 客户端确认扣币幂等键。 */
    @NotBlank(message = "解锁请求幂等键不能为空")
    @Size(max = 64, message = "解锁请求幂等键不能超过64个字符，请重新发起解锁")
    private String requestId;
    /** 报价接口返回的短期令牌。 */
    @NotBlank(message = "报价令牌不能为空")
    @Size(max = 64, message = "报价令牌不能超过64个字符，请重新发起解锁")
    private String quoteToken;
}
