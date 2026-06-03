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

    /** 内容类型：sincere_post（诚意贴）/ normal_post（普通动态） */
    @NotBlank(message = "内容类型不能为空")
    private String postType;

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
}
