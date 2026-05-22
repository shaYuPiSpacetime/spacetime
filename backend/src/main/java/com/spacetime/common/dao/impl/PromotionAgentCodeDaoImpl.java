package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentCodeDao;
import com.spacetime.common.entity.PromotionAgentCode;
import com.spacetime.common.mapper.PromotionAgentCodeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理码数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentCodeDaoImpl implements PromotionAgentCodeDao {
    private final PromotionAgentCodeMapper mapper;

    @Override
    public PromotionAgentCode selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionAgentCode selectByAgentCode(String agentCode) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionAgentCode>().eq(PromotionAgentCode::getAgentCode, agentCode));
    }

    @Override
    public Page<PromotionAgentCode> selectPage(Page<PromotionAgentCode> page, LambdaQueryWrapper<PromotionAgentCode> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgentCode entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionAgentCode entity) {
        mapper.updateById(entity);
    }
}
