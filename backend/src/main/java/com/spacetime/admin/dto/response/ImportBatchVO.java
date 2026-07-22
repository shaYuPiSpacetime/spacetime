package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * App 用户导入批次响应。
 */
@Data
public class ImportBatchVO {
    /** 导入批次号 */
    private String batchNo;
    /** 原始文件名 */
    private String fileName;
    /** 总行数 */
    private Integer totalCount;
    /** 预校验成功行数 */
    private Integer successCount;
    /** 预校验失败行数 */
    private Integer failCount;
    /** 重复行数 */
    private Integer duplicateCount;
    /** 实际入库成功用户数 */
    private Integer importedCount;
    /** 实际入库用户 ID，前端用于快速定位导入结果 */
    private java.util.List<Long> importedUserIds;
    /** 批次状态 */
    private String status;
    /** 错误摘要 JSON */
    private String errorSummaryJson;
    /** 提示信息 */
    private String message;
    /** 创建时间 */
    private LocalDateTime createTime;
}
