package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 社区内容卡片
 */
@Data
public class CommunityPostCardVO {

    /** 内容ID */
    private Long id;
    /** 作者用户ID */
    private Long authorId;
    /** 作者昵称 */
    private String authorName;
    /** 作者头像 */
    private String authorAvatar;
    /** 内容类型 */
    private String postType;
    /** 标题 */
    private String title;
    /** 正文（列表页可能截断） */
    private String content;
    /** 图片URL列表 */
    private List<String> imageUrls;
    /** 话题ID */
    private Long topicId;
    /** 话题名称 */
    private String topicName;
    /** 点赞数 */
    private Integer likeCount;
    /** 评论数 */
    private Integer commentCount;
    /** 举报数 */
    private Integer reportCount;
    /** 当前用户是否已点赞 */
    private Boolean liked;
    /** 当前用户是否已关注作者 */
    private Boolean followingAuthor;
    /** 内容状态 */
    private String status;
    /** 审核状态 */
    private String auditStatus;
    /** 创建时间（yyyy-MM-dd HH:mm:ss） */
    private String createTime;
}
