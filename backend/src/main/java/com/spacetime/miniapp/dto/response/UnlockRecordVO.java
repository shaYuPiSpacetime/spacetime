package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 解锁记录响应
 */
@Data
public class UnlockRecordVO {
    /** 记录 ID */
    private Long id;
    /** 解锁场景 */
    private String unlockScene;
    /** 解锁方式 */
    private String unlockMethod;
    /** 消耗成家币 */
    private Integer coinCost;
    /** 生效时间 */
    private LocalDateTime effectiveTime;
    /** 过期时间 */
    private LocalDateTime expireTime;
    /** 状态 */
    private String status;
}
