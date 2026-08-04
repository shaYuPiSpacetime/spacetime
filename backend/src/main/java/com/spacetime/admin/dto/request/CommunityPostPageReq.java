package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 后台社区内容分页查询
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityPostPageReq extends PageReq {
    /** 作者ID */
    private Long authorId;
    /** 页面筛选使用的用户ID，兼容 authorId */
    private Long userId;
    /** 页面域：content/moments */
    private String scope;
    /** 内容类型 @see CommunityPostTypeEnum */
    private String postType;
    /** 页面提交的内容类型，兼容 postType */
    private String contentType;
    private String sourceScene;
    private String mediaType;
    private String machineResult;
    private String distributionScene;
    private Boolean reported;
    private LocalDate startTime;
    private LocalDate endTime;
    /** 内容状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 话题ID */
    private Long topicId;
    /** 关键词搜索 */
    private String keyword;
}
