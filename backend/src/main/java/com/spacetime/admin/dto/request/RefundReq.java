package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 退款处理请求
 */
@Data
public class RefundReq {
    /** 退款原因 */
    @NotBlank(message = "退款原因不能为空")
    private String reason;
}
