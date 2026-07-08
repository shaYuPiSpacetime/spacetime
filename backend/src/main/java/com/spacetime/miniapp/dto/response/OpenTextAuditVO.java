package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 开放性文字审核提交结果。
 */
@Data
public class OpenTextAuditVO {
    /** 字段类型。 */
    private String fieldName;
    /** 审核状态。 */
    private String auditStatus;
    /** 审核来源：MACHINE、MANUAL。 */
    private String auditSource;
    /** 驳回原因。 */
    private String rejectReason;
}
