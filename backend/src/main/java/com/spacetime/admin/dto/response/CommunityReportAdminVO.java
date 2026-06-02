package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台举报视图
 */
@Data
public class CommunityReportAdminVO {
    private Long id;
    private Long reporterId;
    private String reporterName;
    private String reporterPhone;
    private String targetType;
    private Long targetId;
    private String reasonCode;
    private String reasonLabel;
    private String extraText;
    private String status;
    private String handleAction;
    private String handleRemark;
    private Long handlerId;
    private String handlerName;
    private String createTime;
    private String updateTime;
}
