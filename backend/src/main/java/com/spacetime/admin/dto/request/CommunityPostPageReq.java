package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 后台社区内容分页查询
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityPostPageReq extends PageReq {
    /** 作者ID */
    private Long authorId;
    /** 内容类型 @see CommunityPostTypeEnum */
    private String postType;
    /** 内容状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 话题ID */
    private Long topicId;
    /** 关键词搜索 */
    private String keyword;
}
