package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 公告与协议预置内容视图对象。
 */
@Data
public class ComplianceContentVO {
    private Long id;
    private String contentCode;
    /** 兼容管理端字段口径，值与 contentCode 一致。 */
    private String contentType;
    /** 内容类型的中文展示名称。 */
    private String contentTypeLabel;
    private String type;
    private String title;
    private String version;
    private String linkType;
    private String contentUrl;
    private String effectiveTime;
    private String status;
    private String updateTime;
    private Long updatedBy;
}
