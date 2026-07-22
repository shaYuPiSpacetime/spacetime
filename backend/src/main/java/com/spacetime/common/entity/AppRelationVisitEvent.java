package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 每次实际进入婚恋用户主页的访问事件。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_visit_event")
public class AppRelationVisitEvent extends BaseEntity {
    /** 单次主页进入事件幂等编号。 */
    private String eventNo;
    /** 归并后的访客展示记录 ID。 */
    private Long visitId;
    /** 访问者用户 ID。 */
    private Long visitorUserId;
    /** 被访问者用户 ID。 */
    private Long targetUserId;
    /** 本次实际访问来源。 @see RelationSourceSceneEnum */
    private String sourceScene;
    /** 经服务端校正后的实际访问时间。 */
    private LocalDateTime visitTime;
}
