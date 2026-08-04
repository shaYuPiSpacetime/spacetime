package com.spacetime.admin.dto.response;

import lombok.Data;

/** 社区治理审计记录。 */
@Data
public class CommunityAuditLogVO {
    private Long id;
    private String operatorName;
    private String action;
    private String actionName;
    private String remark;
    private String createTime;
}
