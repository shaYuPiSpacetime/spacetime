package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 支付回调日志预留
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_payment_notify_log")
public class PaymentNotifyLog extends BaseEntity {
    /** 支付渠道 */
    private String payChannel;
    /** 订单编号 */
    private String orderNo;
    /** 渠道交易单号 */
    private String channelTradeNo;
    /** 回调类型 */
    private String notifyType;
    /** 回调原文 */
    private String notifyPayload;
    /** 处理状态: success/failed/ignored */
    private String processStatus;
    /** 处理结果摘要 */
    private String processMessage;
    /** 通知时间 */
    private LocalDateTime notifyTime;
}
