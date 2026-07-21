package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * App 用户导出任务记录。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_export_task")
public class AppUserExportTask extends BaseEntity {
    /** 导出任务编号 */
    private String taskNo;
    /** 导出类型 */
    private String exportType;
    /** 任务状态 */
    private String status;
    /** 前端提示文案 */
    private String message;
    /** 本次导出使用的列表筛选条件摘要 */
    private String filterSummary;
    /** 导出文件名 */
    private String fileName;
    /** 导出行数 */
    private Integer rowCount;
    /** CSV 文件内容，便于历史结果再次下载 */
    private String downloadContent;
    /** 操作管理员 ID */
    private Long operatorId;
}
