package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/** 社区配置版本。 */
@Data
public class CommunityConfigVersionVO {
    private String versionNo;
    private Integer version;
    private List<CommunityConfigItemVO> items;
    private List<CommunityConfigSectionVO> sections;
    private List<CommunityAuditLogVO> changeLogs;
    private Boolean initialized;
}
