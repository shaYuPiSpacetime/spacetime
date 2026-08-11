package com.spacetime.common.model.message;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户管理私信消息查询投影，不包含正文。 */
@Data
public class AppUserPrivateMessageProjection {
    private String messageNo;
    private Long senderUserId;
    private Long receiverUserId;
    private String messageType;
    private String conversationNo;
    private String sendStatus;
    private String receiverReadStatus;
    private LocalDateTime receiverReadAt;
    private String failureCode;
    private String failureReason;
    private LocalDateTime businessTime;
    private LocalDateTime contentClearedAt;
    private Boolean contentAvailable;
}
