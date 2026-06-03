package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 社区公共配置
 */
@Data
public class CommunityConfigVO {
    private String interactionGateMode;
    private Integer postMaxImages;
    private Integer postMaxTextLength;
    private Integer postMaxMentions;
    private Integer sincerePostMinTextLength;
    private Boolean contactInfoAllowed;
    private Boolean reportEntryEnabled;
    private List<MiniappEntryConfigVO> homeTabs;
}
