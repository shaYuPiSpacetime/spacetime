package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** APP 用户喜欢关系明细。 */
@Data
public class AppUserRelationLikeVO {
    private String recordNo;
    private String direction;
    private RelationCounterpartyVO counterparty;
    private String sourceScene;
    private String status;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private LocalDateTime likedTime;
    private String unlockNo;
}
