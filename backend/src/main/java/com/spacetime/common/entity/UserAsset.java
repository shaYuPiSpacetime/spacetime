package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 用户资产
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_asset")
public class UserAsset extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** VIP状态: inactive/active/expired */
    private String vipStatus;
    /** VIP到期时间 */
    private LocalDateTime vipExpireTime;
    /** 成家币余额 */
    private Integer coinBalance;
    /** 今日剩余免费悄悄话次数 */
    private Integer todayFreeWhisperRemain;
    /** 累计充值金额 */
    private BigDecimal totalRecharge;
    /** 最后消费时间 */
    private LocalDateTime lastConsumeTime;
    /** 最后购买时间 */
    private LocalDateTime lastPurchaseTime;
}
