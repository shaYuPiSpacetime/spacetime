package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 推荐浏览与回看事件。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ct_recommend_view_log")
public class RecommendViewLog extends BaseEntity {
    private String eventNo;
    private String requestId;
    private Long userId;
    private Long candidateUserId;
    private String scene;
    private Integer filterVersion;
    private String snapshotNo;
    private String action;
    private Integer position;
    private LocalDateTime viewedAt;
}
