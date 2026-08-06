package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 理想型筛选不可变快照。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ct_ideal_filter_snapshot")
public class IdealFilterSnapshot extends BaseEntity {
    private String snapshotNo;
    private Long userId;
    private String requestId;
    private String conditionDigest;
    private Integer preferenceVersion;
    private String targetCityCodes;
    private Integer minAge;
    private Integer maxAge;
    private String conditionCodes;
    private String conditionPayload;
    private Integer resultCount;
    private String status;
    private LocalDateTime expiresAt;
}
