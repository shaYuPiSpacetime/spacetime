package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 社区举报请求
 */
@Data
public class CommunityReportCreateReq {

    /** 举报目标类型：post/comment/user/chat；其余聊天类型仅用于历史兼容。 */
    @NotBlank(message = "举报目标类型不能为空")
    private String targetType;

    /** 社区举报目标ID；聊天举报使用 targetBizNo。 */
    private String targetId;

    /** 客户端举报幂等编号；聊天举报必填，举报人下唯一。 */
    @Size(min = 8, max = 64, message = "客户端举报编号长度必须为8-64个字符")
    private String clientReportId;

    /** 服务端可反查的消息、会话或悄悄话业务编号。 */
    @Size(max = 64, message = "举报目标业务编号不能超过64个字符")
    private String targetBizNo;

    /** TIM 单聊会话编号，仅用于服务端交叉校验。 */
    @Size(max = 128, message = "TIM会话编号不能超过128个字符")
    private String timConversationId;

    /** TIM 消息编号，仅用于服务端交叉校验。 */
    @Size(max = 128, message = "TIM消息编号不能超过128个字符")
    private String timMessageId;

    /** TIM 消息唯一键，仅用于服务端交叉校验。 */
    @Size(max = 128, message = "TIM消息唯一键不能超过128个字符")
    private String timMsgKey;

    /** 举报原因代码（取自字典 community_report_reason） */
    @NotBlank(message = "举报原因不能为空")
    private String reasonCode;

    /** 补充说明（可选） */
    private String extraText;

    /** 举报人上传的图片凭证 URL，最多 3 张。 */
    @Size(max = 3, message = "举报凭证图片最多上传3张")
    private List<String> evidenceImageUrls;

    /** 聊天举报最小上下文；正文和被举报用户 ID 不允许由客户端提交。 */
    private String sourceType;
    private String conversationNo;
    private String whisperNo;
    private String messageNo;
}
