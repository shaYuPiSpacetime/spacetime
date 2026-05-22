package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 邀请关系表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_invite_relation")
public class PromotionInviteRelation extends BaseEntity {
    /** 关系编号 */
    private String relationNo;
    /** 来源记录ID */
    private Long sourceTraceId;
    /** 来源类型 */
    private String sourceType;
    /** 普通邀请人ID */
    private Long inviterId;
    /** 被邀请用户ID */
    private Long inviteeId;
    /** 代理ID */
    private Long agentId;
    /** 代理码 */
    private String agentCode;
    /** 状态 */
    private String status;
    /** 绑定时间 */
    private LocalDateTime bindTime;
    /** 首次点击时间 */
    private LocalDateTime firstClickTime;
    /** 注册时间 */
    private LocalDateTime registerTime;
    /** 首次登录时间 */
    private LocalDateTime firstLoginTime;
    /** 资料完成时间 */
    private LocalDateTime profileCompleteTime;
    /** 三项认证完成时间 */
    private LocalDateTime verifySuccessTime;
    /** 无效原因 */
    private String invalidReason;
    /** 冻结原因 */
    private String frozenReason;
    /** 累计奖励 */
    private BigDecimal totalRewardCoin;
}
