package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 社区举报请求
 */
@Data
public class CommunityReportCreateReq {
    @NotBlank(message = "举报目标类型不能为空")
    private String targetType;
    @NotNull(message = "举报目标ID不能为空")
    private Long targetId;
    @NotBlank(message = "举报原因不能为空")
    private String reasonCode;
    private String extraText;
}
