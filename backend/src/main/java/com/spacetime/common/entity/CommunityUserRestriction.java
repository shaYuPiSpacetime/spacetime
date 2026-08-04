package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 社区用户警告/禁言限制。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_user_restriction")
public class CommunityUserRestriction extends BaseEntity {
    private Long userId;
    private String restrictionType;
    private String reason;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Integer activeMarker;
    private Long sourceReportId;
    private Integer version;
}
