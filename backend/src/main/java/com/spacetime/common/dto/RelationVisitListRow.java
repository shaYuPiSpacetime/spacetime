package com.spacetime.common.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** 最近访客按访问者用户聚合后的数据库分页投影。 */
@Data
public class RelationVisitListRow {
    /** 最近一条 30 分钟展示窗口记录主键，用于稳定排序。 */
    private Long id;
    /** 最近展示窗口业务编号，单条解锁时作为审计来源。 */
    private String visitNo;
    private Long visitorUserId;
    /** 最近展示窗口的首次访问来源。 */
    private String sourceScene;
    /** 最近 7 天聚合后的首次访问时间。 */
    private LocalDateTime firstVisitTime;
    /** 最近 7 天聚合后的最后访问时间。 */
    private LocalDateTime lastVisitTime;
    /** 最近 7 天聚合后的实际访问次数。 */
    private Long visitCount;
    /** 按目标用户维度生效的最近一次单条解锁时间。 */
    private LocalDateTime unlockTime;
}
