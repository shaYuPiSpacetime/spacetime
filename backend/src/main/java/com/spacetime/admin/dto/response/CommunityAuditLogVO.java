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
    /** 仅后台机审日志返回的历史内部证据。 */
    private com.fasterxml.jackson.databind.JsonNode machineEvidence;
}
