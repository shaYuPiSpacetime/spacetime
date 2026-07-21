package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 访客滚动 30 分钟归并后的展示记录。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_visit")
public class AppRelationVisit extends BaseEntity {
    /** 访客展示记录编号，前缀 VIS-。 */
    private String visitNo;
    /** 访问者用户 ID。 */
    private Long visitorUserId;
    /** 被访问者用户 ID。 */
    private Long targetUserId;
    /** 展示记录首次来源，归并访问不得覆盖。 @see RelationSourceSceneEnum */
    private String sourceScene;
    /** 访客展示记录状态。 @see RelationVisitStatusEnum */
    private String visitStatus;
    /** 本展示记录首次访问时间。 */
    private LocalDateTime firstVisitTime;
    /** 最近一次实际访问时间。 */
    private LocalDateTime lastVisitTime;
    /** 本展示记录包含的实际访问次数。 */
    private Integer pvCount;
    /** 失效原因。 @see RelationInvalidReasonEnum */
    private String invalidReason;
    /** 失效业务时间。 */
    private LocalDateTime invalidTime;
}
