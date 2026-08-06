package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 理想型筛选快照创建结果。 */
@Data
public class IdealSearchVO {
    private String snapshotNo;
    private Integer resultCount;
    private LocalDateTime expiresAt;
}
