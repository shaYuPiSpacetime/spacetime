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
    private Long postId;
    private Long authorId;
    private String status;
    private String auditStatus;
    private String keyword;
}
