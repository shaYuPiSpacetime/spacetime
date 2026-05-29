package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FeedbackStatusUpdateReq {
    @NotBlank(message = "状态不能为空")
    private String status;
    @NotBlank(message = "处理备注不能为空")
    private String remark;
}
