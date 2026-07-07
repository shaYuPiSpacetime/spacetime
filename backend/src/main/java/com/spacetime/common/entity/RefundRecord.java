package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款记录
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_refund_record")
public class RefundRecord extends BaseEntity {
    /** 退款单号 */
    private String refundNo;
    /** 订单 ID */
    private Long orderId;
    /** 订单编号 */
    private String orderNo;
    /** 用户 ID */
    private Long userId;
    /** 退款金额 */
    private BigDecimal refundAmount;
    /** 退款原因 */
    private String refundReason;
    /** 退款状态: success/failed/processing */
    private String refundStatus;
    /** 发起人 ID */
    private Long operatorId;
    /** 发起人名称 */
    private String operatorName;
    /** 资产回退动作 */
    private String assetRollbackAction;
    /** 渠道退款单号 */
    private String channelRefundNo;
    /** 渠道退款状态 */
    private String channelRefundStatus;
    /** 渠道响应摘要 */
    private String channelResponseSummary;
    /** 退款完成时间 */
    private LocalDateTime refundTime;
}
