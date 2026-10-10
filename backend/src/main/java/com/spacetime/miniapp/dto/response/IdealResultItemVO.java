package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 理想型结果项；未解锁时强识别字段保持 null 并由全局 NON_NULL 隐藏。 */
@Data
public class IdealResultItemVO {
    private String itemNo;
    private Boolean unlocked;
    private String blurAvatarUrl;
    /** 当前周岁展示值；兼容既有字段名，已不再按年龄段模糊化。 */
    private String ageBand;
    private String cityName;
    private String educationLabel;
    private String schoolSummary;
    private List<String> matchedConditionNames;
    private String candidateNo;
    private PublicProfileVO profile;
    private String communicationMode;
    private LocalDateTime unlockExpiresAt;
}
