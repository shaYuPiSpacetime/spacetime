package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 社区评论请求
 */
@Data
public class CommunityCommentCreateReq {

    /** 动态（帖子）ID */
    @NotNull(message = "动态ID不能为空")
    private Long postId;

    /** 父评论ID（回复评论时使用，一级评论为null） */
    private Long parentCommentId;

    /** 被回复用户ID（仅回复评论时有值） */
    private Long replyUserId;

    /** 评论内容 */
    @NotBlank(message = "评论内容不能为空")
    private String content;
}
