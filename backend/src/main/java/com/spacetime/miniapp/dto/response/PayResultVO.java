package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 支付结果响应
 */
@Data
public class PayResultVO {
    /** 订单ID */
    private Long orderId;
    /** 订单编号 */
    private String orderNo;
    /** 订单类型 */
    private String orderType;
    /** 订单套餐快照名称 */
    private String packageName;
    /** 订单实付金额 */
    private java.math.BigDecimal payAmount;
    /** 订单创建时间 */
    private LocalDateTime createTime;
    /** 订单状态 */
    private String orderStatus;
    /** 当前千寻币余额（充值订单返回） */
    private Integer coinBalance;
    /** 本订单到账千寻币数量 */
    private Integer coinAmount;
    /** VIP 到期时间（VIP 订单返回） */
    private LocalDateTime vipExpireTime;
    /** 订单关闭时间 */
    private LocalDateTime expireTime;
    /** 订单支付成功时间 */
    private LocalDateTime successTime;
}
