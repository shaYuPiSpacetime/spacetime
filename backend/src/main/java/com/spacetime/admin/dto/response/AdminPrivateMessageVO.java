package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户私信消息元数据，不包含正文。 */
@Data
public class AdminPrivateMessageVO {
    private String messageNo;
    private String direction;
    private Long peerUserId;
    private String peerNickname;
    private String peerMask;
    private String messageType;
    private String conversationNo;
    private String sendStatus;
    private String receiverReadStatus;
    private LocalDateTime receiverReadAt;
    private String failureCode;
    private String failureReason;
    private LocalDateTime businessTime;
    private Boolean contentAvailable;
}
