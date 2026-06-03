package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 成家币流水（金币流水）响应
 */
@Data
public class CoinFlowVO {
    /** 主键ID */
    private Long id;
    /** 流水号 */
    private String flowNo;
    /** 用户ID */
    private Long userId;
    /** 流水类型 @see FlowTypeEnum */
    private String flowType;
    /** 变动金额（正数为增加，负数为减少） */
    private Integer changeAmount;
    /** 变动后余额 */
    private Integer balanceAfter;
    /** 业务场景 @see BizSceneEnum */
    private String bizScene;
    /** 业务描述 */
    private String bizDesc;
    /** 关联业务ID */
    private Long refId;
    /** 关联业务类型 */
    private String refType;
    /** 创建时间 */
    private LocalDateTime createTime;
}
