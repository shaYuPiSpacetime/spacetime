package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 审核历史记录视图。
 */
@Data
public class AuditHistoryVO {
    /** 历史记录 ID */
    private Long id;
    /** 审核记录 ID */
    private Long auditRecordId;
    /** 变更前状态 */
    private String fromStatus;
    /** 变更后状态 */
    private String toStatus;
    /** 审核来源：MACHINE/MANUAL */
    private String auditSource;
    /** 审核动作 */
    private String action;
    /** 驳回或失效原因 */
    private String reason;
    /** 操作人类型 */
    private String operatorType;
    /** 操作人名称 */
    private String operatorName;
    /** 三方任务 ID */
    private Long providerTaskId;
    /** 操作时间 */
    private String createTime;
}
