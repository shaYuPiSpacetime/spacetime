package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 理想型快照结果页。 */
@Data
public class IdealResultPageVO {
    private String snapshotNo;
    private String status;
    private IdealConditionSummaryVO summary;
    private Integer resultCount;
    private Integer unlockableCount;
    private List<IdealResultItemVO> items;
    private String nextCursor;
    private IdealPricingVO pricing;
}
