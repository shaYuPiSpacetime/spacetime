package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 单条关系记录确认解锁结果。 */
@Data
public class UnlockConfirmVO {
    private String unlockNo;
    private String targetBizType;
    private String targetBizNo;
    private Long targetUserId;
    private String status;
    private Integer coinCost;
    private Integer coinBalance;
    private String displayStatus;
    /** 本次请求是否实际扣币；幂等复用或已解锁时为 false。 */
    private Boolean charged;
    private LocalDateTime effectiveTime;
    private LocalDateTime expireTime;
}
