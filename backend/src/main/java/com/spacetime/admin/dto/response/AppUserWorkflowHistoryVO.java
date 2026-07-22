package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * App 用户导入/导出历史记录。
 */
@Data
public class AppUserWorkflowHistoryVO {
    /** 前端列表唯一 ID */
    private String id;
    /** 记录类型：import=导入，export=导出 */
    private String type;
    /** 记录创建时间 */
    private LocalDateTime createTime;
    /** 导入结果摘要 */
    private ImportBatchVO importResult;
    /** 导出结果摘要 */
    private ExportTaskVO exportResult;
}
