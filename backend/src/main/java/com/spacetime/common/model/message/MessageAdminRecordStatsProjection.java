package com.spacetime.common.model.message;

import lombok.Data;

/** 后台消息元数据统计投影。 */
@Data
public class MessageAdminRecordStatsProjection {
    private Long totalCount;
    private Long privateMessageCount;
    private Long whisperMessageCount;
    private Long systemMessageCount;
    private Long assistantMessageCount;
    private Long failedCount;
    private Long caseLinkedCount;
}
