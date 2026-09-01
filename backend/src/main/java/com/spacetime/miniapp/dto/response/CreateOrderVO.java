package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 创建订单响应
 */
@Data
public class CreateOrderVO {
    /** 订单 ID */
    private Long orderId;
    /** 订单编号 */
    private String orderNo;
    /** 实际支付金额 */
    private BigDecimal payAmount;
    /** 支付渠道 */
    private String payChannel;
    /** 小程序应调用的支付模式 */
    private String paymentMode;
    /** 微信支付参数 */
    private WechatPayParamsVO payParams;
    /** 微信虚拟支付参数 */
    private WechatVirtualPayParamsVO virtualPayParams;
}
