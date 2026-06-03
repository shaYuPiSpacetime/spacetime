package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台社区内容视图
 */
@Data
public class CommunityPostAdminVO {
    /** 主键ID */
    private Long id;
    /** 作者ID */
    private Long authorId;
    /** 作者昵称 */
    private String authorName;
    /** 作者手机号 */
    private String authorPhone;
    /** 内容类型 @see CommunityPostTypeEnum */
    private String postType;
    /** 标题 */
    private String title;
    /** 内容 */
    private String content;
    /** 话题ID */
    private Long topicId;
    /** 话题名称 */
    private String topicName;
    /** 点赞数 */
    private Integer likeCount;
    /** 评论数 */
    private Integer commentCount;
    /** 被举报次数 */
    private Integer reportCount;
    /** 内容状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    private String auditRemark;
    /** 创建时间 */
    private String createTime;
    /** 更新时间 */
    private String updateTime;
}
