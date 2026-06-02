package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 社区动态/诚意贴
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_post")
public class CommunityPost extends BaseEntity {
    /** 作者ID */
    private Long authorId;
    /** 动态类型 @see CommunityPostTypeEnum */
    private String postType;
    /** 标题 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String title;
    /** 正文 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String content;
    /** 图片URL列表(JSON数组) */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String imageUrls;
    /** 话题ID */
    private Long topicId;
    /** @提及用户ID列表(JSON数组) */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String mentionUserIds;
    /** 发布状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String auditRemark;
    /** 点赞数 */
    private Integer likeCount;
    /** 评论数 */
    private Integer commentCount;
    /** 被举报次数 */
    private Integer reportCount;
    /** 用户主动删除标记(0=未删/1=已删) */
    private Integer deletedByUser;
}
