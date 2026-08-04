package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 社区话题详情
 */
@Data
public class CommunityTopicDetailVO {

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
}
