package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 社区审核和敏感治理审计。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_audit_record")
public class CommunityAuditRecord extends BaseEntity {
    private String bizType;
    private String bizNo;
    private Long bizId;
    private String action;
    private String result;
    private String beforeSnapshot;
    private String afterSnapshot;
    private String reason;
    private String providerCode;
    private Long operatorId;
    private String operatorIp;
}
