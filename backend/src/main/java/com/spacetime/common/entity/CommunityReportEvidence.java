package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 聊天举报案件不可变受控明文证据。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_report_evidence")
public class CommunityReportEvidence extends BaseEntity {
    private String evidenceNo;
    private Long reportId;
    private String reportNo;
    private String evidenceType;
    private String targetType;
    private String sourceBizNo;
    private String conversationNo;
    private Long senderUserId;
    private Long receiverUserId;
    private String messageType;
    private String contentText;
    private LocalDateTime eventTime;
    private Integer contextOrder;
    private String severity;
    private LocalDateTime snapshotAt;
    private LocalDateTime retainUntil;
    private LocalDateTime anonymizedAt;
}
