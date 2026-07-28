package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 推广列表异步导出任务。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_export_task")
public class PromotionExportTask extends BaseEntity {
    private String taskNo;
    private String pageType;
    private String filterJson;
    private String status;
    private String fileName;
    private String fileUrl;
    private Integer rowCount;
    private String failureReason;
    private LocalDateTime finishedAt;
}
