package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 后台消息列表元数据，不包含正文或正文摘要。 */
@Data
public class AdminMessageRecordVO {
    private String recordNo;
    private String recordType;
    private String userMask;
    private String peerMask;
    private String messageType;
    private String systemCategory;
    private String status;
    private LocalDateTime createdTime;
    private Long caseCount;
}
