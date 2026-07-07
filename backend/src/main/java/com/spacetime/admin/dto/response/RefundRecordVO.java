package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款记录响应
 */
@Data
public class RefundRecordVO {
    /** 退款记录 ID */
    private Long id;
    /** 退款单号 */
    private String refundNo;
    /** 订单 ID */
    private Long orderId;
    /** 订单编号 */
    private String orderNo;
    /** 用户 ID */
    private Long userId;
    /** 订单类型 */
    private String orderType;
    /** 套餐名称 */
    private String packageName;
    /** 支付金额 */
    private BigDecimal payAmount;
    /** 订单状态 */
    private String orderStatus;
    /** 退款金额 */
    private BigDecimal refundAmount;
    /** 退款原因 */
    private String refundReason;
    /** 退款状态 */
    private String refundStatus;
    /** 资产回退动作 */
    private String assetRollbackAction;
    /** 渠道退款状态 */
    private String channelRefundStatus;
    /** 退款时间 */
    private LocalDateTime refundTime;
    /** 订单创建时间 */
    private LocalDateTime createTime;
}
