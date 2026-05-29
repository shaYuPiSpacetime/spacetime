package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交易订单响应
 */
@Data
public class TradeOrderVO {
    private Long id;
    private String orderNo;
    private Long userId;
    private String orderType;
    private Long packageId;
    private String packageName;
    private BigDecimal payAmount;
    private String orderStatus;
    private LocalDateTime successTime;
    private LocalDateTime expireTime;
    private LocalDateTime refundTime;
    private String refundReason;
    private String remark;
    private LocalDateTime createTime;
}
