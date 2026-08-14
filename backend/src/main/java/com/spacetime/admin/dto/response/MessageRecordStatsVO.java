package com.spacetime.admin.dto.response;

import lombok.Data;

/** 消息记录页固定业务口径统计，不跟随列表筛选。 */
@Data
public class MessageRecordStatsVO {
    private Long todayPrivateMessageCount;
    private Long waitingWhisperCount;
    private Long systemMessageCount;
    private Long caseLinkedCount;
}
