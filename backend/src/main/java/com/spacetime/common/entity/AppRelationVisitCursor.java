package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 每个有向用户对的访客滚动归并游标。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_visit_cursor")
public class AppRelationVisitCursor extends BaseEntity {
    /** 访问者用户 ID。 */
    private Long visitorUserId;
    /** 被访问者用户 ID。 */
    private Long targetUserId;
    /** 当前允许继续归并的访客展示记录 ID。 */
    private Long currentVisitId;
    /** 最近一次成功计入 PV 的时间。 */
    private LocalDateTime lastVisitTime;
}
