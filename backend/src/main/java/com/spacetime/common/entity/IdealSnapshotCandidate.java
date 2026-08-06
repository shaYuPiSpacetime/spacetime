package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 理想型筛选快照候选。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ct_ideal_snapshot_candidate")
public class IdealSnapshotCandidate extends BaseEntity {
    private Long snapshotId;
    private String itemNo;
    private Long candidateUserId;
    private LocalDateTime sortTime;
    private String sortTieBreaker;
    private String matchedConditionCodes;
}
