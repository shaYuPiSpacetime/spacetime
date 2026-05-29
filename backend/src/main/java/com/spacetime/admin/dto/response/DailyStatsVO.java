package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 按日统计响应
 */
@Data
public class DailyStatsVO {
    /** 统计日期 */
    private String date;
    /** VIP 订单数 */
    private Long vipOrderCount;
    /** 成家币订单数 */
    private Long coinOrderCount;
    /** 退款订单数 */
    private Long refundOrderCount;
    /** 总交易金额 */
    private BigDecimal totalAmount;
}
