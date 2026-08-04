package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/** 管理端家园话题。 */
@Data
public class CommunityTopicAdminVO {
    private Long id;
    private String topicCode;
    private String topicName;
    private String description;
    private String coverUrl;
    private List<String> displayScenes;
    private Boolean recommended;
    private Integer sort;
    private String status;
    private String statusName;
    private Long contentCount;
    private Long heatValue;
    private Integer version;
    private String createTime;
    private String updateTime;
    private List<CommunityAuditLogVO> auditLogs;
}
