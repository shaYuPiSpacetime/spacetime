package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 代理推广事件表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent_event")
public class PromotionAgentEvent extends BaseEntity {
    /** 代理ID */
    private Long agentId;
    /** 校园代理二维码编号 */
    private String qrCode;
    /** 邀请关系ID */
    private Long relationId;
    /** 被推广用户ID */
    private Long userId;
    /** 事件类型 */
    private String eventType;
    /** 事件时间 */
    private LocalDateTime eventTime;
    /** 是否已生成奖金 */
    private Integer bonusGenerated;
}
