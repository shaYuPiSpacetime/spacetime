package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 社区内容发布请求
 */
@Data
public class CommunityPostCreateReq {
    @NotBlank(message = "内容类型不能为空")
    private String postType;
    private String title;
    @NotBlank(message = "正文不能为空")
    private String content;
    private List<String> imageUrls;
    @NotNull(message = "话题不能为空")
    private Long topicId;
    private List<Long> mentionUserIds;
}
