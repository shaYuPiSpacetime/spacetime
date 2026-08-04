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
    private String postNo;
    /** 作者用户ID */
    private Long authorId;
    private String authorUserNo;
    /** 作者昵称 */
    private String authorName;
    /** 作者头像 */
    private String authorAvatar;
    /** 作者性别字典 code */
    private String authorGender;
    /** 作者年龄 */
    private Integer authorAge;
    /** 作者所在城市 code */
    private String authorCity;
    /** 作者星座 */
    private String authorZodiac;
    /** 作者年收入字典 code */
    private String authorAnnualIncome;
    private String authorProfession;
    /** 内容类型 */
    private String postType;
    private String contentType;
    /** 标题 */
    private String title;
    /** 正文（列表页可能截断） */
    private String content;
    /** 图片URL列表 */
    private List<String> imageUrls;
    /** 话题ID */
    private Long topicId;
    private String topicCode;
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
    private Boolean hiddenAuthor;
    /** 内容状态 */
    private String status;
    private String statusName;
    private String statusMessage;
    /** 审核状态 */
    private String auditStatus;
    private String auditRemark;
    /** 创建时间（yyyy-MM-dd HH:mm:ss） */
    private String createTime;
}
