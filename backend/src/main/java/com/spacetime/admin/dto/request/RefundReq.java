package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 退款处理请求
 */
@Data
public class RefundReq {
    /** 退款原因 */
    @NotBlank(message = "退款原因不能为空")
    private String reason;
    /** 退款金额，默认取订单实付金额 */
    private BigDecimal refundAmount;
    /** 资产回退动作 */
    private String assetRollbackAction;
}
