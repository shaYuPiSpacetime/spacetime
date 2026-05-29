package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class OrderPageReq extends PageReq {
    /** 订单号 */
    private String orderNo;
    /** 用户 ID */
    private Long userId;
    /** 订单类型 */
    private String orderType;
    /** 订单状态 */
    private String orderStatus;
    /** 支付金额最小值 */
    private BigDecimal payAmountMin;
    /** 支付金额最大值 */
    private BigDecimal payAmountMax;
    /** 开始时间 */
    private LocalDateTime startTime;
    /** 结束时间 */
    private LocalDateTime endTime;
}
