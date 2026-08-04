package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

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
    /** 页面筛选使用的用户ID，兼容 authorId */
    private Long userId;
    /** 所属内容业务编号 */
    private String postNo;
    /** 是否被举报 */
    private Boolean reported;
    /** 发布开始日期 */
    private LocalDate startTime;
    /** 发布结束日期 */
    private LocalDate endTime;
    /** 评论状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 关键词搜索 */
    private String keyword;
}
