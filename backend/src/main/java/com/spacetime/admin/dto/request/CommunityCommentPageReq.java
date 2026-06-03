package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 后台评论分页查询
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityCommentPageReq extends PageReq {
    /** 动态ID */
    private Long postId;
    /** 评论作者ID */
    private Long authorId;
    /** 评论状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 关键词搜索 */
    private String keyword;
}
