package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 结算单发放请求
 */
@Data
public class PromotionSettlementPaidReq {
    /** 已发放金额 */
    @NotNull(message = "已发放金额不能为空")
    private BigDecimal paidAmount;
    /** 备注 */
    private String remark;
}
