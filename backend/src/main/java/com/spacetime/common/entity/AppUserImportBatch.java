package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * App 用户导入批次。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_import_batch")
public class AppUserImportBatch extends BaseEntity {
    /** 导入批次号 */
    private String batchNo;
    /** 原始文件名 */
    private String fileName;
    /** 总行数 */
    private Integer totalCount;
    /** 成功行数 */
    private Integer successCount;
    /** 失败行数 */
    private Integer failCount;
    /** 批次状态 */
    private String status;
    /** 操作管理员 ID */
    private Long operatorId;
    /** 结果文件 URL */
    private String resultUrl;
    /** 错误摘要 JSON */
    private String errorSummaryJson;
}
