package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 三天回放单人主页实时报价。 */
@Data
public class RecommendReplayQuoteVO {
    private Boolean canOpen;
    private Boolean memberAccess;
    private Integer unitPrice;
    private Integer coinBalance;
}
