package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 状态变更请求（通用）
 */
@Data
public class StatusUpdateReq {
    /** 目标状态 */
    @NotBlank(message = "状态不能为空")
    private String status;
}
