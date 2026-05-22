package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 状态更新请求
 */
@Data
public class PromotionStatusUpdateReq {
    /** 状态 */
    @NotBlank(message = "状态不能为空")
    private String status;
}
