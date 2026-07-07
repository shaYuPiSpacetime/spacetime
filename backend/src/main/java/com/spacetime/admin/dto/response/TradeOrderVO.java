package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交易订单响应
 */
@Data
public class TradeOrderVO {
    /** 主键ID */
    private Long id;
    /** 订单号 */
    private String orderNo;
    /** 用户ID */
    private Long userId;
    /** 订单类型 @see OrderTypeEnum */
    private String orderType;
    /** 套餐ID */
    private Long packageId;
    /** 套餐名称 */
    private String packageName;
    /** 支付金额（元） */
    private BigDecimal payAmount;
    /** 支付渠道 */
    private String payChannel;
    /** 渠道交易单号 */
    private String channelTradeNo;
    /** 微信预支付交易会话标识 */
    private String prepayId;
    /** 支付回调原始摘要 */
    private String notifySummary;
    /** 订单状态 @see OrderStatusEnum */
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
    /** 创建时间 */
    private LocalDateTime createTime;
}
