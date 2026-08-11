package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 系统消息与官方助手不可变模板版本。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_template_version")
public class AppMessageTemplateVersion extends BaseEntity {
    private String templateCode;
    private String bizType;
    private String notificationType;
    private String versionNo;
    private String status;
    private Integer activeMarker;
    private String titleTemplate;
    private String contentTemplate;
    private String allowedVariablesJson;
    private String jumpType;
    private String jumpValueTemplate;
    private Integer safetyRequired;
    private Long publishedBy;
    private LocalDateTime publishedAt;
    private String remark;
}
