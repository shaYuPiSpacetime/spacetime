package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** APP 用户关系单条解锁记录。 */
@Data
public class AppUserRelationUnlockVO {
    private String unlockNo;
    private String targetBizType;
    private String targetBizNo;
    private RelationCounterpartyVO counterparty;
    private String unlockScene;
    private String unlockMethod;
    private Integer coinCost;
    private String status;
    private LocalDateTime effectiveTime;
    private LocalDateTime expireTime;
    private Boolean targetAvailable;
    private String targetInvalidReason;
    private LocalDateTime targetInvalidTime;
    private Boolean assetVisible;
}
