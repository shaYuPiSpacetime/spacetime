package com.spacetime.common.model.message;

import lombok.Data;

import java.time.LocalDateTime;

/** 跨消息表的后台元数据投影，结构上不包含任何正文列。 */
@Data
public class MessageAdminRecordProjection {
    private String recordNo;
    private String recordType;
    private Long userId;
    private Long peerUserId;
    private String messageType;
    private String systemCategory;
    private String status;
    private LocalDateTime businessTime;
    private String conversationNo;
    private String sourceBizNo;
    private String timMessageId;
    private String timMsgKey;
    private String failureCode;
    private String failureReason;
    private LocalDateTime contentClearedAt;
    private Long caseCount;
}
