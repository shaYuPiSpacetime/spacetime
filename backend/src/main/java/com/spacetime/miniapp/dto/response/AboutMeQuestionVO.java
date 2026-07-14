package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 关于我固定题目。 */
@Data
public class AboutMeQuestionVO {
    private String questionKey;
    private String title;
    private String placeholder;
    private String latestContent;
    private String effectiveContent;
    private String auditStatus;
    private String rejectReason;
    private Boolean canSubmit;
}
