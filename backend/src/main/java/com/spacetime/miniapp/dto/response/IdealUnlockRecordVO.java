package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 理想型用户逐项解锁历史；失效项不返回公开资料。 */
@Data
public class IdealUnlockRecordVO {
    private String unlockNo;
    private String scene;
    private String snapshotNo;
    private String itemNo;
    private LocalDateTime unlockedAt;
    private LocalDateTime expiresAt;
    private String status;
    private Integer cost;
    private Boolean available;
    private PublicProfileVO profile;
    private String communicationMode;
    private String educationLabel;
    private String schoolSummary;
    private List<String> matchedConditionNames;
}
