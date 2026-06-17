package com.spacetime.common.dao;

import com.spacetime.common.entity.PromotionAgentStat;

/**
 * 代理统计数据访问接口。
 */
public interface PromotionAgentStatDao {
    PromotionAgentStat selectByAgentId(Long agentId);
    void insert(PromotionAgentStat entity);
    void updateById(PromotionAgentStat entity);
}
