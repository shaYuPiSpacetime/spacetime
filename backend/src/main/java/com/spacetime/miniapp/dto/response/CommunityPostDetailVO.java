package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 社区内容详情
 */
@Data
public class CommunityPostDetailVO {
    private Long id;
    private Long authorId;
    private String authorName;
    private String authorAvatar;
    private String postType;
    private String title;
    private String content;
    private List<String> imageUrls;
    private Long topicId;
    private String topicName;
    private List<Long> mentionUserIds;
    private Integer likeCount;
    private Integer commentCount;
    private Integer reportCount;
    private Boolean liked;
    private Boolean followingAuthor;
    private String status;
    private String auditStatus;
    private String auditRemark;
    private String createTime;
}
