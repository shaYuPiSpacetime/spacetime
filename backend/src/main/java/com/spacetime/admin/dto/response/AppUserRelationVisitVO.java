package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** APP 用户访客关系明细。 */
@Data
public class AppUserRelationVisitVO {
    private String recordNo;
    private String direction;
    private RelationCounterpartyVO counterparty;
    private String sourceScene;
    private String status;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private LocalDateTime firstVisitTime;
    private LocalDateTime lastVisitTime;
    private Integer visitCount;
    private String unlockNo;
}
