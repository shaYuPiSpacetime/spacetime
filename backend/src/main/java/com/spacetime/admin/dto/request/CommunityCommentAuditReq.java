package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台评论审核请求
 */
@Data
public class CommunityCommentAuditReq {
    /** 审核状态 @see CommunityAuditStatusEnum */
    @NotBlank(message = "审核状态不能为空")
    private String auditStatus;
    /** 审核备注 */
    private String auditRemark;
}
