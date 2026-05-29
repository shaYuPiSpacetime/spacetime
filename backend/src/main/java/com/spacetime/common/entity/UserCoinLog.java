package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 成家币流水
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_coin_log")
public class UserCoinLog extends BaseEntity {
    /** 流水号 */
    private String flowNo;
    /** 用户ID */
    private Long userId;
    /** 流水类型: recharge/consume/gift/refund */
    private String flowType;
    /** 变动数量 */
    private Integer changeAmount;
    /** 变动后余额 */
    private Integer balanceAfter;
    /** 业务场景 */
    private String bizScene;
    /** 业务描述 */
    private String bizDesc;
    /** 关联业务ID */
    private Long refId;
    /** 关联业务类型 */
    private String refType;
}
