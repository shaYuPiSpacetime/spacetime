package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 社区话题列表卡片
 */
@Data
public class CommunityTopicCardVO {

    /** 话题ID */
    private Long id;
    private String topicCode;
    /** 话题名称 */
    private String name;
    /** 话题说明 */
    private String description;
    /** 话题头图，未配置时由客户端使用设计兜底图 */
    private String coverUrl;
    /** 已发布动态数 */
    private Long postCount;
    /** 去重参与用户数 */
    private Long participantCount;
    /** 参与用户头像，最多5个 */
    private List<String> participantAvatars;
    /** 预览动态正文 */
    private String previewContent;
    /** 预览动态首图 */
    private String previewImageUrl;
    /** 预览动态作者ID */
    private Long previewAuthorId;
    /** 预览动态作者昵称 */
    private String previewAuthorName;
    /** 预览动态作者头像 */
    private String previewAuthorAvatar;
    /** 预览动态发布时间 */
    private String previewCreateTime;
}
