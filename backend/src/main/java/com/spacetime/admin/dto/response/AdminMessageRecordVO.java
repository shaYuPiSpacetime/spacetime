package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 后台消息列表元数据，不包含正文或正文摘要。 */
@Data
public class AdminMessageRecordVO {
    private String recordNo;
    private String recordType;
    private Long userId;
    private String userNickname;
    private Long peerUserId;
    private String peerNickname;
    /** @deprecated 使用用户 ID 与昵称，保留字段仅用于兼容旧客户端。 */
    @Deprecated
    private String userMask;
    /** @deprecated 使用对方用户 ID 与昵称，保留字段仅用于兼容旧客户端。 */
    @Deprecated
    private String peerMask;
    private String messageType;
    private String systemCategory;
    private String status;
    private LocalDateTime createdTime;
    private Long caseCount;
}
