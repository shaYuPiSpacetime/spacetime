package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 邀请规则 H5 当前版本与安全快照。
 */
@Data
public class InviteRulesH5VO {
    private String title;
    private String version;
    private LocalDateTime updatedAt;
    private Boolean enabled;
    private String url;
    private String htmlSnapshot;
}
