package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 推广来源追踪表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_source_trace")
public class PromotionSourceTrace extends BaseEntity {
    /** 来源追踪号 */
    private String traceNo;
    /** 来源类型 */
    private String sourceType;
    /** 普通邀请人ID */
    private Long inviterId;
    /** 代理ID */
    private Long agentId;
    /** 代理永久二维码令牌 */
    private String qrToken;
    /** 请求幂等键；visitorKey 为空时不生成 */
    private String requestKey;
    /** 本次归因来源被客户端记录的时间 */
    private LocalDateTime tracedAt;
}
