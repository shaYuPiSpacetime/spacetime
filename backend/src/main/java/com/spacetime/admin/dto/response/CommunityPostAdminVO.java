package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台社区内容视图
 */
@Data
public class CommunityPostAdminVO {
    private Long id;
    private Long authorId;
    private String authorName;
    private String authorPhone;
    private String postType;
    private String title;
    private String content;
    private Long topicId;
    private String topicName;
    private Integer likeCount;
    private Integer commentCount;
    private Integer reportCount;
    private String status;
    private String auditStatus;
    private String auditRemark;
    private String createTime;
    private String updateTime;
}
