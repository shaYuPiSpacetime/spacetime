package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户悄悄话业务元数据，不包含申请或回复正文。 */
@Data
public class AdminWhisperVO {
    private String whisperNo;
    private String direction;
    private Long peerUserId;
    private String peerNickname;
    private String peerMask;
    private String status;
    private String payType;
    private String paymentStatus;
    private Integer coinAmount;
    private String deliveryStatus;
    private String sourceScene;
    private String sourceBizNo;
    private Boolean receiverHidden;
    private LocalDateTime receiverHiddenAt;
    private String receiverHideType;
    private LocalDateTime expiresAt;
    private LocalDateTime repliedAt;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private String matchNo;
    private String conversationNo;
    private String requestMessageNo;
    private String replyMessageNo;
    private String failureReason;
    private Boolean contentAvailable;
    private LocalDateTime createTime;
}
