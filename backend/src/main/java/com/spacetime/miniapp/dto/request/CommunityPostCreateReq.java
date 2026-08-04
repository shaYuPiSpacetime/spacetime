package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 社区内容发布请求
 */
@Data
public class CommunityPostCreateReq {

    /** 内容类型：sincere_post（诚意贴）/ normal_post（普通动态） */
    private String postType;

    /** 正式字段；postType 仅保留旧客户端兼容。 */
    private String contentType;

    /** 标题（诚意贴必填，普通动态可选） */
    private String title;

    /** 正文内容 */
    @NotBlank(message = "正文不能为空")
    private String content;

    /** 图片URL列表（最多9张） */
    private List<String> imageUrls;

    /** 话题ID（字典数据） */
    @NotNull(message = "话题不能为空")
    private Long topicId;

    /** @提及的用户ID列表（最多5人） */
    private List<Long> mentionUserIds;

    @AssertTrue(message = "内容类型不能为空")
    public boolean isContentTypePresent() {
        return (contentType != null && !contentType.isBlank()) || (postType != null && !postType.isBlank());
    }

    public String resolvedContentType() {
        String value = contentType != null && !contentType.isBlank() ? contentType : postType;
        return "community".equals(value) || "normal_post".equals(value) ? "community_post" : value;
    }
}
