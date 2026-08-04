package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
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
    @NotBlank(message = "举报目标ID不能为空")
    private String targetId;

    /** 举报原因代码（取自字典 community_report_reason） */
    @NotBlank(message = "举报原因不能为空")
    private String reasonCode;

    /** 补充说明（可选） */
    private String extraText;

    /** 聊天举报最小上下文；正文和被举报用户 ID 不允许由客户端提交。 */
    private String sourceType;
    private String conversationNo;
    private String whisperNo;
    private String messageNo;
}
