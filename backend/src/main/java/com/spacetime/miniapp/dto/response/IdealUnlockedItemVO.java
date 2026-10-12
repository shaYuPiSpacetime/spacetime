package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 理想型确认解锁后的可识别结果项。 */
@Data
public class IdealUnlockedItemVO {
    private String itemNo;
    private String candidateNo;
    /** 单人解锁可直接返回资料；批量回执为空，由历史解锁页分页读取。 */
    private PublicProfileVO profile;
    private String communicationMode;
    private LocalDateTime unlockExpiresAt;
}
