package com.spacetime.admin.dto.response;

import lombok.Data;

/** 社区异步导出任务。 */
@Data
public class CommunityExportTaskVO {
    private Long id;
    private String taskNo;
    private String exportType;
    private String status;
    private Integer progress;
    private String fileUrl;
    private String errorMessage;
    private String createTime;
    private String completedTime;
}
