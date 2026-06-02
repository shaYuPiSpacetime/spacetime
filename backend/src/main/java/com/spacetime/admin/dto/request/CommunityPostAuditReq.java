package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台社区内容审核请求
 */
@Data
public class CommunityPostAuditReq {
    @NotBlank(message = "审核状态不能为空")
    private String auditStatus;
    private String auditRemark;
}
