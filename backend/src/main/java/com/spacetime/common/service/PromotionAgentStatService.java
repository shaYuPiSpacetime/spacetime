package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentStat;

/**
 * 代理统计预聚合服务。
 */
public interface PromotionAgentStatService {
    /** 新增代理时初始化统计行。 */
    void initAgentStat(PromotionAgent agent);

    /** 查询统计快照，不存在时返回空统计对象。 */
    PromotionAgentStat getOrEmpty(Long agentId);

    /** 事件写入后刷新代理统计，失败不影响主业务。 */
    void safeRefreshByEvent(Long agentId);

    /** 奖金流水变化后刷新代理统计，失败不影响主业务。 */
    void safeRefreshByBonus(Long agentId);

    /** 结算状态变化后刷新代理统计，失败不影响主业务。 */
    void safeRefreshBySettlement(Long agentId);

    /** 从事实表重算并覆盖统计快照。 */
    PromotionAgentStat rebuildAgentStat(Long agentId);
}
