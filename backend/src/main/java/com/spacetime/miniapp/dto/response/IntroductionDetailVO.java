package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 自我介绍页回显信息。
 * 最新提交用于本人继续查看审核进度，生效内容用于说明当前对外展示内容。
 */
@Data
public class IntroductionDetailVO {
    private String latestContent;
    private String effectiveContent;
    private String auditStatus;
    private String auditSource;
    private String rejectReason;
    private String submitTime;
    private Boolean canSubmit;
}
