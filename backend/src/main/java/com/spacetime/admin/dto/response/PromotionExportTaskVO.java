package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 推广异步导出任务响应。
 */
@Data
public class PromotionExportTaskVO {
    private String taskNo;
    private String pageType;
    private String status;
    private String fileName;
    private String downloadUrl;
    private Integer rowCount;
    private String failureReason;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;
}
