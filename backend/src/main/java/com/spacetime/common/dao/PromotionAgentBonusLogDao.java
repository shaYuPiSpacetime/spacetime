package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgentBonusLog;

/**
 * 代理奖金数据访问接口
 */
public interface PromotionAgentBonusLogDao {
    PromotionAgentBonusLog selectById(Long id);
    Page<PromotionAgentBonusLog> selectPage(Page<PromotionAgentBonusLog> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgentBonusLog> wrapper);
    void insert(PromotionAgentBonusLog entity);
    void updateById(PromotionAgentBonusLog entity);
}
