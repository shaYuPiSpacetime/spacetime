package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 社区评论
 */
@Data
public class CommunityCommentVO {

    /** 评论ID */
    private Long id;
    private String commentNo;
    /** 所属帖子ID */
    private Long postId;
    private String postNo;
    /** 评论作者用户ID */
    private Long authorId;
    /** 评论作者昵称 */
    private String authorName;
    /** 评论作者头像 */
    private String authorAvatar;
    /** 评论作者性别 */
    private String authorGender;
    /** 评论作者出生年份 */
    private Integer authorBirthYear;
    /** 评论作者现居城市 */
    private String authorCity;
    /** 评论作者职业 */
    private String authorProfession;
    /** 父评论ID（一级评论为null） */
    private Long parentCommentId;
    /** 被回复用户ID */
    private Long replyUserId;
    /** 被回复用户昵称 */
    private String replyUserName;
    /** 评论内容 */
    private String content;
    /** 评论状态 */
    private String status;
    private String statusName;
    private Boolean liked;
    private Integer likeCount;
    /** 审核状态 */
    private String auditStatus;
    /** 创建时间（yyyy-MM-dd HH:mm:ss） */
    private String createTime;
}
