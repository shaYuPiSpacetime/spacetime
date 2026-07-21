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
    /** 本次导出使用的列表筛选条件摘要 */
    private String filterSummary;
    /** 导出文件名 */
    private String fileName;
    /** 导出行数 */
    private Integer rowCount;
    /** CSV 文件内容，前端直接下载 */
    private String downloadContent;
    /** 创建时间 */
    private LocalDateTime createTime;
}
