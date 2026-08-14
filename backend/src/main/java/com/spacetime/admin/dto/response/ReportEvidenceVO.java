package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 举报冻结证据元数据，不包含正文。 */
@Data
public class ReportEvidenceVO {
    private String evidenceNo;
    private String evidenceType;
    private String targetType;
    private String sourceBizNo;
    private String conversationNo;
    private String senderMask;
    private String receiverMask;
    private String messageType;
    private LocalDateTime eventTime;
    private Integer contextOrder;
    private String severity;
    private LocalDateTime snapshotAt;
    private LocalDateTime retainUntil;
    private boolean contentAvailable;
}
