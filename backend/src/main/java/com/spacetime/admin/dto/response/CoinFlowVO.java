package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 成家币流水（金币流水）响应
 */
@Data
public class CoinFlowVO {
    private Long id;
    private String flowNo;
    private Long userId;
    private String flowType;
    private Integer changeAmount;
    private Integer balanceAfter;
    private String bizScene;
    private String bizDesc;
    private Long refId;
    private String refType;
    private LocalDateTime createTime;
}
