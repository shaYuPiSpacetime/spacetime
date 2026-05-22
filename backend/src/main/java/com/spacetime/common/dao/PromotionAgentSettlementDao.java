package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgentSettlement;

/**
 * 代理结算数据访问接口
 */
public interface PromotionAgentSettlementDao {
    PromotionAgentSettlement selectById(Long id);
    PromotionAgentSettlement selectBySettlementNo(String settlementNo);
    Page<PromotionAgentSettlement> selectPage(Page<PromotionAgentSettlement> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgentSettlement> wrapper);
    void insert(PromotionAgentSettlement entity);
    void updateById(PromotionAgentSettlement entity);
}
