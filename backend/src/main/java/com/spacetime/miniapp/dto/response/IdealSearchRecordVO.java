package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 一次理想型筛选不可变历史记录。 */
@Data
public class IdealSearchRecordVO {
    private String snapshotNo;
    private IdealConditionSummaryVO summary;
    private Integer resultCount;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
