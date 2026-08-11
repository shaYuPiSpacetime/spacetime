package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 提交举报业务结果。 */
@Data
public class CommunityReportResultVO {
    private Long reportId;
    private String reportNo;
    private String status;
    private String statusName;
    private String message;
    private String snapshotStatus;
    private LocalDateTime createdTime;

    public CommunityReportResultVO(Long reportId, String reportNo, String status,
                                   String statusName, String message) {
        this(reportId, reportNo, status, statusName, message, null, null);
    }

    public CommunityReportResultVO(Long reportId, String reportNo, String status,
                                   String statusName, String message, String snapshotStatus,
                                   LocalDateTime createdTime) {
        this.reportId = reportId;
        this.reportNo = reportNo;
        this.status = status;
        this.statusName = statusName;
        this.message = message;
        this.snapshotStatus = snapshotStatus;
        this.createdTime = createdTime;
    }
}
