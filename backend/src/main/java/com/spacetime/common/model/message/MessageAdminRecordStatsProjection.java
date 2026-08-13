package com.spacetime.common.model.message;

import lombok.Data;

/** 后台消息记录页固定业务口径统计投影。 */
@Data
public class MessageAdminRecordStatsProjection {
    private Long todayPrivateMessageCount;
    private Long waitingWhisperCount;
    private Long systemMessageCount;
    private Long caseLinkedCount;
}
