package com.spacetime.admin.dto.response;

import lombok.Data;

@Data
public class AdminUserSecuritySummaryVO {
    private Long userId;
    private String nickname;
    private Long blacklistCount;
    private Long hiddenDynamicCount;
    private Long keywordCount;
    private Long feedbackCount;
    private Long searchCount;
    private String cancelStatus;
}
