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
    /** 套餐名称 */
    private String packageName;
    /** 支付金额 */
    private BigDecimal payAmount;
    /** 订单状态 */
    private String orderStatus;
    /** 支付成功时间 */
    private LocalDateTime successTime;
    /** VIP 到期时间 */
    private LocalDateTime expireTime;
}
