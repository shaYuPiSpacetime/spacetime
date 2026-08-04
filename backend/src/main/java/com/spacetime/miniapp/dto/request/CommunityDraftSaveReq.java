package com.spacetime.miniapp.dto.request;

import lombok.Data;

import java.util.List;

/** 保存社区发布草稿。 */
@Data
public class CommunityDraftSaveReq {
    private String content;
    private List<String> imageUrls;
    private List<ImageItem> images;
    private Long topicId;
    private Integer version;

    @Data
    public static class ImageItem {
        private String url;
        private String objectKey;
    }
}
