package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户关联举报案件元数据。 */
@Data
public class AdminReportLinkVO {
    private String reportNo;
    private String direction;
    private String targetType;
    private String targetBizNo;
    private String sourceScene;
    private String reasonCode;
    private String status;
    private String snapshotStatus;
    private LocalDateTime createTime;
}
