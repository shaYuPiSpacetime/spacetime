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
    /** 累计注册数 */
    private Integer registerCnt;
    /** 累计资料完善数 */
    private Integer profileCnt;
    /** 累计认证完成数 */
    private Integer verifyCnt;
    /** 累计成功邀请数 */
    private Integer successCnt;
    /** 累计首次会员数 */
    private Integer firstVipCnt;
    /** 累计首次充值成家币人数 */
    private Integer firstCoinRechargeCnt;
    /** 累计应发奖金 */
    private BigDecimal bonusDueAmount;
    /** 累计待结算奖金 */
    private BigDecimal bonusPendingAmount;
    /** 累计已确认待发奖金 */
    private BigDecimal bonusConfirmedAmount;
    /** 累计已发奖金 */
    private BigDecimal bonusPaidAmount;
    /** 最近一次代理事件时间 */
    private LocalDateTime lastEventTime;
    /** 最近一次结算状态更新时间 */
    private LocalDateTime lastSettlementTime;
    /** 最近一次全量重算时间 */
    private LocalDateTime lastRebuildTime;
    /** 统计版本 */
    private Integer statVersion;
    /** 备注 */
    private String remark;
}
