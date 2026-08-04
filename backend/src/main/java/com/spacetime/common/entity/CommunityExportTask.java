package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 社区异步导出任务。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_export_task")
public class CommunityExportTask extends BaseEntity {
    private String taskNo;
    private String exportType;
    private String filterJson;
    private String status;
    private Integer progress;
    private String fileUrl;
    private String errorMessage;
    private Long requesterId;
    private LocalDateTime completedAt;
}
