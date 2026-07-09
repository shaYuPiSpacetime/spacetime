package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * VIP 状态响应
 */
@Data
public class VipStatusVO {
    /** VIP 状态 */
    private String vipStatus;
    /** VIP 到期时间 */
    private LocalDateTime vipExpireTime;
    /** 当前生效订单编号 */
    private String orderNo;
    /** 当前生效套餐 ID */
    private Long packageId;
    /** 当前生效套餐名称 */
    private String packageName;
    /** 订阅类型：once/month/quarter/year 等 */
    private String subscriptionType;
    /** 会员生效时间 */
    private LocalDateTime memberStartTime;
    /** 支付渠道 */
    private String payChannel;
}
