package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 后台举报处理请求
 */
@Data
public class CommunityReportHandleReq {
    /** 处理结果状态 @see CommunityReportStatusEnum */
    @NotBlank(message = "处理结果不能为空")
    private String status;
    /** 处理动作 @see CommunityReportHandleActionEnum */
    private String handleAction;
    /** 处理备注 */
    private String handleRemark;
}
