package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 管理后台 — 资审核操作请求
 */
@Data
public class ModerationAuditReq {
    /** 审核动作: APPROVE(通过) / REJECT(驳回) */
    @NotBlank(message = "审核动作不能为空")
    private String action;
    /** 驳回原因（驳回时必填，前端REJECT时必须传入） */
    private String rejectReason;

    /** 校验驳回时 rejectReason 不为空 */
    public boolean isRejectReasonValid() {
        if ("REJECT".equals(action)) {
            return rejectReason != null && !rejectReason.trim().isEmpty();
        }
        return true;
    }
}
