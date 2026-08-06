package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 理想型确认解锁后的可识别结果项。 */
@Data
public class IdealUnlockedItemVO {
    private String itemNo;
    private String candidateNo;
    private PublicProfileVO profile;
    private String communicationMode;
    private LocalDateTime unlockExpiresAt;
}
