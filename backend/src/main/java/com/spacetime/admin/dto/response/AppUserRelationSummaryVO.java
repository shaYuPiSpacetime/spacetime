package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** APP 用户关系反馈摘要。 */
@Data
public class AppUserRelationSummaryVO {
    private Long userId;
    private String relationshipAccess;
    private Boolean vipVisible;
    private String vipStatus;
    private Long activeLikedCount;
    private Long visitorUv7d;
    private Long visitorPv7d;
    private Long activeMutualCount;
    private LocalDateTime lastMatchTime;
}
