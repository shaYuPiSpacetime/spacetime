package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 推荐候选卡片。 */
@Data
public class RecommendCandidateVO {
    private String candidateNo;
    private Long userId;
    private PublicProfileVO profile;
    private Boolean liked;
    private String communicationMode;
    private String actualCity;
}
