package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 代理结算单表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent_settlement")
public class PromotionAgentSettlement extends BaseEntity {
    /** 结算单号 */
    private String settlementNo;
    /** 代理ID */
    private Long agentId;
    /** 结算月份，固定为当月首日 */
    private LocalDate settlementMonth;
    /** 应结算金额 */
    private BigDecimal payableAmount;
    /** 状态 */
    private String status;
    /** 确认时间 */
    private LocalDateTime confirmedTime;
    /** 确认人ID */
    private Long confirmedBy;
    /** 备注 */
    private String remark;
}
