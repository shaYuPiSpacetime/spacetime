package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 提交举报业务结果。 */
@Data
@AllArgsConstructor
public class CommunityReportResultVO {
    private Long reportId;
    private String reportNo;
    private String status;
    private String statusName;
    private String message;
}
