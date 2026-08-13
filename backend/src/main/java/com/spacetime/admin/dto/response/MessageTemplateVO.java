package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 消息模板版本视图。 */
@Data
public class MessageTemplateVO {
    private String templateCode;
    private String bizType;
    private String notificationType;
    private String versionNo;
    private String status;
    private Boolean current;
    private String titleTemplate;
    private String contentTemplate;
    private String cardType;
    private String contentFormat;
    private String actionTextTemplate;
    private List<String> allowedVariables;
    private String jumpType;
    private String jumpValueTemplate;
    private Boolean safetyRequired;
    private Long publishedBy;
    private LocalDateTime publishedAt;
    private String remark;
}
