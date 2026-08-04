package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 家园话题。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_topic")
public class CommunityTopic extends BaseEntity {
    private String topicCode;
    private String topicName;
    private String description;
    private String coverUrl;
    private String coverAuditStatus;
    private String displayScenes;
    private Integer recommended;
    private Integer sort;
    private String status;
    private Integer version;
    private Long legacyDictId;
}
