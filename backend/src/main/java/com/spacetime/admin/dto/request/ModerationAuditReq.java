package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 管理后台 — 审核操作请求
 */
@Data
public class ModerationAuditReq {
    /** 审核动作: APPROVE(通过) / REJECT(驳回) / EXPIRE(失效) */
    @NotBlank(message = "审核动作不能为空")
    private String action;
    /** 驳回或失效原因。 */
    private String rejectReason;

    /** 校验驳回和失效时 rejectReason 不为空。 */
    public boolean isRejectReasonValid() {
        if ("REJECT".equals(action) || "EXPIRE".equals(action)) {
            return rejectReason != null && !rejectReason.trim().isEmpty();
        }
        return true;
    }
}
