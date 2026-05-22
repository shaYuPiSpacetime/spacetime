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
    /** 结算开始日期 */
    private LocalDate periodStart;
    /** 结算结束日期 */
    private LocalDate periodEnd;
    /** 统计口径说明 */
    private String statsDesc;
    /** 应结算金额 */
    private BigDecimal payableAmount;
    /** 已结算金额 */
    private BigDecimal paidAmount;
    /** 状态 */
    private String status;
    /** 确认时间 */
    private LocalDateTime confirmTime;
    /** 发放时间 */
    private LocalDateTime paidTime;
    /** 操作人ID */
    private Long operatorId;
    /** 备注 */
    private String remark;
}
