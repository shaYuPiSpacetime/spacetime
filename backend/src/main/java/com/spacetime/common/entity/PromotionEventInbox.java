package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 主业务事实事件收件箱。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_event_inbox")
public class PromotionEventInbox extends BaseEntity {
    /** 全局事件键 */
    private String eventKey;
    /** 正式奖励事件 */
    private String eventType;
    /** 事件用户 */
    private Long userId;
    /** 关联业务编号 */
    private String bizNo;
    /** 必要上下文 JSON */
    private String payloadJson;
    /** 发生时锁定的普通规则版本 */
    private Long normalRuleId;
    /** 发生时锁定的代理规则版本 */
    private Long agentRuleId;
    /** 技术状态：pending/processing/success/failed */
    private String status;
    /** 技术重试次数 */
    private Integer retryCount;
    /** 下次重试时间 */
    private LocalDateTime nextRetryTime;
    /** 最近错误摘要 */
    private String lastError;
    /** 处理时间 */
    private LocalDateTime processedAt;
}
