package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 社区评论
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_comment")
public class CommunityComment extends BaseEntity {
    /** 所属动态ID */
    private Long postId;
    /** 评论者ID */
    private Long authorId;
    /** 父评论ID(楼中楼回复) */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long parentCommentId;
    /** 被回复者ID */
    private Long replyUserId;
    /** 评论内容 */
    private String content;
    /** 发布状态 @see CommunityPostStatusEnum */
    private String status;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String auditRemark;
    /** 被举报次数 */
    private Integer reportCount;
}
