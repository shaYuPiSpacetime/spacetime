package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 认证审核详情 — 字段标签-值对
 * 用于 VerificationAuditDetailVO 泛化承载三类认证的内容差异
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FieldEntry {
    /** 字段标签，如"真实姓名" */
    private String label;
    /** 字段值，如"张*三" */
    private String value;
}
