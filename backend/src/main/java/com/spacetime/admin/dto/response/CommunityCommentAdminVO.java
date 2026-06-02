package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台评论视图
 */
@Data
public class CommunityCommentAdminVO {
    private Long id;
    private Long postId;
    private Long authorId;
    private String authorName;
    private String authorPhone;
    private Long parentCommentId;
    private Long replyUserId;
    private String replyUserName;
    private String content;
    private Integer reportCount;
    private String status;
    private String auditStatus;
    private String auditRemark;
    private String createTime;
    private String updateTime;
}
