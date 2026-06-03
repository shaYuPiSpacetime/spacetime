package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 支付结果响应
 */
@Data
public class PayResultVO {
    /** 订单编号 */
    private String orderNo;
    /** 订单状态 */
    private String orderStatus;
    /** 当前成家币余额（充值订单返回） */
    private Integer coinBalance;
    /** VIP 到期时间（VIP 订单返回） */
    private LocalDateTime vipExpireTime;
}
