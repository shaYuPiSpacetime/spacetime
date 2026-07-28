package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 校园代理统计预聚合表。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promo_agent_stat")
public class PromotionAgentStat extends BaseEntity {
    /** 代理ID */
    private Long agentId;
    /** 代理展示编号 */
    private String agentNo;
    /** 累计扫码/点击数 */
    private Integer clickCnt;
    /** 累计成功邀请数 */
    private Integer successInviteCount;
    /** 累计应发奖金 */
    private BigDecimal totalBonusAmount;
    /** 累计待结算奖金 */
    private BigDecimal pendingBonusAmount;
    /** 累计已确认奖金 */
    private BigDecimal confirmedBonusAmount;
    /** 最近一次结算状态更新时间 */
    private LocalDateTime lastSettlementTime;
    /** 最近一次全量重算时间 */
    private LocalDateTime lastRebuildTime;
    /** 统计版本 */
    private Integer statVersion;
}
