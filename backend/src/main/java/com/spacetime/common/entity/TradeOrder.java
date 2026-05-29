package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交易订单
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_trade_order")
public class TradeOrder extends BaseEntity {
    /** 订单编号 */
    private String orderNo;
    /** 用户ID */
    private Long userId;
    /** 订单类型: vip/coin */
    private String orderType;
    /** 套餐ID */
    private Long packageId;
    /** 套餐名称 */
    private String packageName;
    /** 实付金额 */
    private BigDecimal payAmount;
    /** 订单状态: unpaid/success/closed/failed/refunding/refunded */
    private String orderStatus;
    /** 支付成功时间 */
    private LocalDateTime successTime;
    /** 订单过期时间 */
    private LocalDateTime expireTime;
    /** 退款时间 */
    private LocalDateTime refundTime;
    /** 退款原因 */
    private String refundReason;
    /** 备注 */
    private String remark;
}
