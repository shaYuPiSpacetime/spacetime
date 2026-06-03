package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 管理后台 — 更新用户状态请求
 */
@Data
public class UpdateStatusReq {
    /** 目标状态 @see AccountStatusEnum */
    @NotBlank(message = "状态不能为空")
    private String status;
}
