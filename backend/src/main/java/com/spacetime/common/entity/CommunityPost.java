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
    /** 帖子业务编号 */
    private String postNo;
    /** 作者ID */
    private Long authorId;
    /** 动态类型 @see CommunityPostTypeEnum */
    private String postType;
    /** 内容来源场景 */
    private String sourceScene;
    /** 诚意贴标题 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String title;
    /** 正文内容 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String content;
    /** 图片URL列表（JSON数组） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String imageUrls;
    /** 话题ID */
    private Long topicId;
    /** 话题稳定编码 */
    private String topicCode;
    /** 发布时话题名称快照 */
    private String topicNameSnapshot;
    /** @提及用户ID列表（JSON数组） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String mentionUserIds;
    /** 发布状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String auditRemark;
    private String machineResult;
    private String machineCode;
    private String machineDetail;
    private java.time.LocalDateTime machineCheckedAt;
    private Integer sampleRequired;
    private Integer version;
    private java.time.LocalDateTime publishedAt;
    private java.time.LocalDateTime handledAt;
    private String authorIp;
    /** 点赞数 */
    private Integer likeCount;
    /** 评论数 */
    private Integer commentCount;
    /** 被举报次数 */
    private Integer reportCount;
    /** 用户主动删除标记(0=未删/1=已删) */
    private Integer deletedByUser;
}
