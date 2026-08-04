package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 后台评论视图
 */
@Data
public class CommunityCommentAdminVO {
    /** 主键ID */
    private Long id;
    private String commentNo;
    /** 所属动态ID */
    private Long postId;
    /** 所属内容当前是否仍可查看 */
    private Boolean postAvailable;
    private String postNo;
    private String postType;
    private String postTitle;
    private String postSummary;
    private String postContent;
    private List<String> postImageUrls;
    private String postSourceScene;
    private String postStatus;
    private String postStatusName;
    /** 评论作者ID */
    private Long authorId;
    /** 小程序用户业务编号 */
    private String authorNo;
    /** 评论作者昵称 */
    private String authorName;
    /** 评论作者手机号 */
    private String authorPhone;
    /** 父评论ID */
    private Long parentCommentId;
    private String parentContent;
    /** 被回复用户ID */
    private Long replyUserId;
    /** 被回复用户昵称 */
    private String replyUserName;
    /** 评论内容 */
    private String content;
    private Integer likeCount;
    /** 被举报次数 */
    private Integer reportCount;
    /** 评论状态 @see CommunityPostStatusEnum */
    private String status;
    private String statusName;
    /** 审核状态 @see CommunityAuditStatusEnum */
    private String auditStatus;
    /** 审核备注 */
    private String auditRemark;
    private String machineResult;
    private Integer version;
    private List<CommunityAuditLogVO> auditLogs;
    /** 创建时间 */
    private String createTime;
    /** 更新时间 */
    private String updateTime;
}
