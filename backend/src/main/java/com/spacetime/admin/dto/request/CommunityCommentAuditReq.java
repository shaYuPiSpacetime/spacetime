package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台评论审核请求
 */
@Data
public class CommunityCommentAuditReq {
    @NotBlank(message = "审核状态不能为空")
    private String auditStatus;
    private String auditRemark;
}
