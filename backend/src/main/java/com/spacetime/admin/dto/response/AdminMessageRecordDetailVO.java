package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 后台消息详情元数据，不包含正文、密文、IV 和内容摘要。 */
@Data
public class AdminMessageRecordDetailVO {
    private String recordNo;
    private String recordType;
    private String userMask;
    private String peerMask;
    private String messageType;
    private String systemCategory;
    private String status;
    private LocalDateTime createdTime;
    private String conversationNo;
    private String sourceBizNo;
    private String timMessageId;
    private String timMsgKey;
    private String failureCode;
    private String failureReason;
    private LocalDateTime contentClearedAt;
    private Long caseCount;
}
