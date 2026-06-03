package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 创建订单响应
 */
@Data
public class CreateOrderVO {
    /** 订单 ID */
    private Long orderId;
    /** 订单编号 */
    private String orderNo;
}
