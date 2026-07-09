package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * VIP 订单响应
 */
@Data
public class VipOrderVO {
    /** 订单 ID */
    private Long id;
    /** 订单编号 */
    private String orderNo;
    /** 套餐 ID */
    private Long packageId;
    /** 套餐名称 */
    private String packageName;
    /** 订阅类型：once/month/quarter/year 等 */
    private String subscriptionType;
    /** 套餐有效天数 */
    private Integer durationDays;
    /** 支付金额 */
    private BigDecimal payAmount;
    /** 支付渠道 */
    private String payChannel;
    /** 订单状态 */
    private String orderStatus;
    /** 订单创建时间 */
    private LocalDateTime createTime;
    /** 支付成功时间 */
    private LocalDateTime successTime;
    /** VIP 到期时间 */
    private LocalDateTime expireTime;
    /** 退款时间 */
    private LocalDateTime refundTime;
}
