package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 三天回放单人主页解锁结果。 */
@Data
public class RecommendReplayUnlockVO {
    private Boolean canOpen;
    private Integer coinCost;
    private Integer coinBalance;
}
