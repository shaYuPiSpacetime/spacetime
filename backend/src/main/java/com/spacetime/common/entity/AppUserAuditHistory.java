package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * App 用户审核历史。
 * 机审、人工审核、通过、驳回、失效都写入该表，保留当时操作结果。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_audit_history")
public class AppUserAuditHistory extends BaseEntity {
    private Long auditRecordId;
    private Long userId;
    private String auditType;
    private String fromStatus;
    private String toStatus;
    private String auditSource;
    private String action;
    private String reason;
    private String operatorType;
    private Long operatorId;
    private String operatorName;
    private Long providerTaskId;
    private String snapshotJson;
}
