package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 社区评论请求
 */
@Data
public class CommunityCommentCreateReq {
    @NotNull(message = "动态ID不能为空")
    private Long postId;
    private Long parentCommentId;
    private Long replyUserId;
    @NotBlank(message = "评论内容不能为空")
    private String content;
}
