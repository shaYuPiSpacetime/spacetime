package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 三天回看候选项。 */
@Data
public class RecommendReplayItemVO {
    private String candidateNo;
    private PublicProfileVO profile;
    private LocalDateTime viewedAt;
    private String lastAction;
    private String dateGroup;
    private Boolean liked;
}
