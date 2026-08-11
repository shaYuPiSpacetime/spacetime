package com.spacetime.admin.dto.response;

import lombok.Data;

/** 与列表使用同一筛选条件的消息记录统计。 */
@Data
public class MessageRecordStatsVO {
    private Long totalCount;
    private Long privateMessageCount;
    private Long whisperMessageCount;
    private Long systemMessageCount;
    private Long assistantMessageCount;
    private Long failedCount;
    private Long caseLinkedCount;
}
