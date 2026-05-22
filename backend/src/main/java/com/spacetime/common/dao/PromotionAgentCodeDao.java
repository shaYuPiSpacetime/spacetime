package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgentCode;

/**
 * 代理码数据访问接口
 */
public interface PromotionAgentCodeDao {
    PromotionAgentCode selectById(Long id);
    PromotionAgentCode selectByAgentCode(String agentCode);
    Page<PromotionAgentCode> selectPage(Page<PromotionAgentCode> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgentCode> wrapper);
    void insert(PromotionAgentCode entity);
    void updateById(PromotionAgentCode entity);
}
