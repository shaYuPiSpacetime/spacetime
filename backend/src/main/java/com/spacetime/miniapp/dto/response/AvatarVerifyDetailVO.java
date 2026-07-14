package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 头像认证页面回显。 */
@Data
public class AvatarVerifyDetailVO {
    private String latestAvatarUrl;
    private String effectiveAvatarUrl;
    private String auditStatus;
    private String auditSource;
    private String rejectReason;
    private String submitTime;
    private Boolean canSubmit;
}
