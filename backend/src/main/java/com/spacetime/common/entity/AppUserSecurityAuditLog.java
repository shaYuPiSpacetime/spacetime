package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户安全设置审计日志实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_security_audit_log")
public class AppUserSecurityAuditLog extends BaseEntity {
    /** 目标用户ID */
    private Long userId;
    /** 操作人ID */
    private Long operatorId;
    /** 业务类型 */
    private String bizType;
    /** 业务ID */
    private Long bizId;
    /** 动作 */
    private String action;
    /** 变更前摘要 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String beforeValue;
    /** 变更后摘要 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String afterValue;
}
