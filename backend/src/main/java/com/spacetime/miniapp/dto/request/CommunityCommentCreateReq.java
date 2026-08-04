package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 社区评论请求
 */
@Data
public class CommunityCommentCreateReq {

    /** 动态（帖子）ID */
    @NotBlank(message = "动态ID不能为空")
    private String postId;

    public void setPostId(String postId) {
        this.postId = postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId == null ? null : String.valueOf(postId);
    }

    /** 父评论ID（回复评论时使用，一级评论为null） */
    private Long parentCommentId;

    /** 被回复用户ID（仅回复评论时有值） */
    private Long replyUserId;

    /** 评论内容 */
    @NotBlank(message = "评论内容不能为空")
    private String content;
}
