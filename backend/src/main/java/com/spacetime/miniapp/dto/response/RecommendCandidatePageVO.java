package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 推荐候选游标页。 */
@Data
public class RecommendCandidatePageVO {
    private List<RecommendCandidateVO> items;
    private String nextCursor;
    private Integer remainingBrowseCount;
    private String waitingReason;
    private Integer preferenceVersion;
}
