package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 轻量对账日汇总响应
 */
@Data
public class ReconcileDailyVO {
    /** 日期 */
    private String date;
    /** 成功订单数 */
    private Long successOrderCount;
    /** VIP 订单数 */
    private Long vipOrderCount;
    /** 千寻币订单数 */
    private Long coinOrderCount;
    /** 退款订单数 */
    private Long refundOrderCount;
    /** 成功订单金额 */
    private BigDecimal orderAmount;
    /** 退款金额 */
    private BigDecimal refundAmount;
    /** 净收入 */
    private BigDecimal netAmount;
    /** 退款率 */
    private BigDecimal refundRate;
}
