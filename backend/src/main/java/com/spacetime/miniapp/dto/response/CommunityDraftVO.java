package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 社区发布草稿。 */
@Data
public class CommunityDraftVO {
    private Long draftId;
    private String contentType;
    private String content;
    private List<String> imageUrls;
    private List<ImageItem> images;
    private Long topicId;
    private String topicCode;
    private String topicName;
    private Integer version;
    private String updateTime;

    @Data
    public static class ImageItem {
        private String url;
        private String objectKey;
    }
}
