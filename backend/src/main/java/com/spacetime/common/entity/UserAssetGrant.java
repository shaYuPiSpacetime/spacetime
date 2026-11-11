package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/** 用户赠送资产台账，不代表支付订单或充值收入。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_asset_grant")
public class UserAssetGrant extends BaseEntity {
    /** 用户编号 */
    private Long userId;
    /** 全局唯一发放幂等键 */
    private String idempotencyKey;
    /** 发放来源，参见 AssetGrantSourceEnum */
    private String source;
    /** 赠送会员天数 */
    private Integer vipDays;
    /** 赠送千寻币数量 */
    private Integer coinAmount;
    /** 发放前余额 */
    private Integer balanceBefore;
    /** 发放后余额 */
    private Integer balanceAfter;
    /** 发放前会员到期时间 */
    private LocalDateTime vipExpireBefore;
    /** 发放后会员到期时间 */
    private LocalDateTime vipExpireAfter;
    /** 发放原因 */
    private String reason;
    /** 操作人编号，系统奖励为空 */
    private Long operatorId;
    /** 操作人名称 */
    private String operatorName;
}
