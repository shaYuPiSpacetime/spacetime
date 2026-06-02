package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台举报处理请求
 */
@Data
public class CommunityReportHandleReq {
    @NotBlank(message = "处理结果不能为空")
    private String status;
    private String handleAction;
    private String handleRemark;
}
