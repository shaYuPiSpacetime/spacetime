package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 导出任务响应
 */
@Data
public class ExportTaskVO {
    /** 任务编号 */
    private String taskNo;
    /** 导出类型 */
    private String exportType;
    /** 任务状态 */
    private String status;
    /** 提示信息 */
    private String message;
    /** 创建时间 */
    private LocalDateTime createTime;
}
