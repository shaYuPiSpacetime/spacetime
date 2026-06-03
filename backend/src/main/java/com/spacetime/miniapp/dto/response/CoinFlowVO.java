package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 成家币流水响应
 */
@Data
public class CoinFlowVO {
    /** 流水 ID */
    private Long id;
    /** 流水编号 */
    private String flowNo;
    /** 流水类型 */
    private String flowType;
    /** 变动金额 */
    private Integer changeAmount;
    /** 变动后余额 */
    private Integer balanceAfter;
    /** 业务场景 */
    private String bizScene;
    /** 业务描述 */
    private String bizDesc;
    /** 创建时间 */
    private LocalDateTime createTime;
}
