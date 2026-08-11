package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户系统消息元数据，不包含标题或正文。 */
@Data
public class AdminSystemMessageVO {
    private String noticeNo;
    private String notificationType;
    private String bizType;
    private String bizNo;
    private String templateCode;
    private String templateVersion;
    private String readStatus;
    private String jumpType;
    private Boolean safetyRequired;
    private LocalDateTime visibleUntil;
    private LocalDateTime createTime;
}
