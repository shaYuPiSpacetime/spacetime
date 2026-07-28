package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 永久邀请关系事实。
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
    /** 注册时间 */
    private LocalDateTime registeredAt;
}
