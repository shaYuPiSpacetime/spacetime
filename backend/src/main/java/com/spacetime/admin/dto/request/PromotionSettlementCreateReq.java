package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 创建代理结算单请求
 */
@Data
public class PromotionSettlementCreateReq {
    /** 代理ID */
    @NotNull(message = "代理ID不能为空")
    private Long agentId;
    /** 结算开始日期 */
    @NotNull(message = "结算开始日期不能为空")
    private LocalDate periodStart;
    /** 结算结束日期 */
    @NotNull(message = "结算结束日期不能为空")
    private LocalDate periodEnd;
    /** 统计口径说明 */
    private String statsDesc;
    /** 应结算金额 */
    private BigDecimal payableAmount;
    /** 备注 */
    private String remark;
}
