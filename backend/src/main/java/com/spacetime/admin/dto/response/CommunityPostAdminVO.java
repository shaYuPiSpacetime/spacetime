package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 后台社区内容视图
 */
@Data
public class CommunityPostAdminVO {
    /** 主键ID */
    private Long id;
    private String postNo;
    private String auditNo;
    /** 作者ID */
    private Long authorId;
    /** 小程序用户业务编号 */
    private String authorNo;
    /** 作者昵称 */
    private String authorName;
    /** 作者手机号 */
    private String authorPhone;
    /** 内容类型 @see CommunityPostTypeEnum */
    private String postType;
    private String contentType;
    private String sourceScene;
    /** 标题 */
    private String title;
    /** 内容 */
    private String content;
    private String contentSummary;
    private String mediaType;
    private List<String> imageUrls;
    /** 话题ID */
    private Long topicId;
    /** 话题名称 */
    private String topicName;
    private String topicCode;
    private List<String> distributionScenes;
    private Integer readCount;
    /** 点赞数 */
    private Integer likeCount;
    /** 评论数 */
    private Integer commentCount;
    /** 被举报次数 */
    private Integer reportCount;
    /** 内容状态 @see CommunityPostStatusEnum */
    private String status;
    private String statusName;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    private String auditRemark;
    private String machineResult;
    private String machineLabel;
    private String riskLevel;
    private List<String> violationLabels;
    private Integer version;
    private String publishedTime;
    private String handledTime;
    private List<CommunityAuditLogVO> auditLogs;
    /** 创建时间 */
    private String createTime;
    /** 更新时间 */
    private String updateTime;
}
