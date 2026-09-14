package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 用户“最近访客”收件箱读取位置。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_visit_inbox_state")
public class AppRelationVisitInboxState extends BaseEntity {
    /** 被访问用户 ID，每个用户唯一一条。 */
    private Long userId;
    /** 已确认查看到的访问事件时间。 */
    private LocalDateTime lastReadVisitTime;
    /** 已确认查看到的访问事件主键，与时间共同组成稳定游标。 */
    private Long lastReadVisitEventId;
    /** 最近一次成功推进读取位置的时间。 */
    private LocalDateTime readAt;
}
