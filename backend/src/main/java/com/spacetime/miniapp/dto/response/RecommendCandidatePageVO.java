package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 推荐候选游标页。 */
@Data
public class RecommendCandidatePageVO {
    private List<RecommendCandidateVO> items;
    private String nextCursor;
    private Integer remainingBrowseCount;
    /** 下次浏览额度重置的北京时间。 */
    private LocalDateTime nextResetAt;
    private String waitingReason;
    private Integer preferenceVersion;
}
