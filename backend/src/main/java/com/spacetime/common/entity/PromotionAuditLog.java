package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 推广模块操作日志
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_audit_log")
public class PromotionAuditLog extends BaseEntity {
    /** 业务类型 */
    private String bizType;
    /** 业务ID */
    private Long bizId;
    /** 操作动作 */
    private String action;
    /** 变更前 */
    private String beforeValue;
    /** 变更后 */
    private String afterValue;
    /** 备注 */
    private String remark;
}
