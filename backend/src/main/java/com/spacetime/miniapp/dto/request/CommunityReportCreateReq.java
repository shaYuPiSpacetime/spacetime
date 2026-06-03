package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 社区举报请求
 */
@Data
public class CommunityReportCreateReq {

    /** 举报目标类型：post（内容）/ comment（评论）/ user（用户） */
    @NotBlank(message = "举报目标类型不能为空")
    private String targetType;

    /** 举报目标ID */
    @NotNull(message = "举报目标ID不能为空")
    private Long targetId;

    /** 举报原因代码（取自字典 community_report_reason） */
    @NotBlank(message = "举报原因不能为空")
    private String reasonCode;

    /** 补充说明（可选） */
    private String extraText;
}
