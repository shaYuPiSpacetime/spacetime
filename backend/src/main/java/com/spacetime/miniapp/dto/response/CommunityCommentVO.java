package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 社区评论
 */
@Data
public class CommunityCommentVO {
    private Long id;
    private Long postId;
    private Long authorId;
    private String authorName;
    private String authorAvatar;
    private Long parentCommentId;
    private Long replyUserId;
    private String replyUserName;
    private String content;
    private String status;
    private String auditStatus;
    private String createTime;
}
