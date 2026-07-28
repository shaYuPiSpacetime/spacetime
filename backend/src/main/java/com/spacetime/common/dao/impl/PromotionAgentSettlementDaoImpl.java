package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.mapper.PromotionAgentSettlementMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理结算数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentSettlementDaoImpl implements PromotionAgentSettlementDao {
    private final PromotionAgentSettlementMapper mapper;

    @Override
    public PromotionAgentSettlement selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionAgentSettlement selectBySettlementNo(String settlementNo) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionAgentSettlement>().eq(PromotionAgentSettlement::getSettlementNo, settlementNo));
    }

    @Override
    public PromotionAgentSettlement selectBySettlementNoForUpdate(String settlementNo) {
        return mapper.selectBySettlementNoForUpdate(settlementNo);
    }

    @Override
    public PromotionAgentSettlement selectByAgentIdAndMonth(Long agentId, java.time.LocalDate month) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionAgentSettlement>()
                .eq(PromotionAgentSettlement::getAgentId, agentId)
                .eq(PromotionAgentSettlement::getSettlementMonth, month));
    }

    @Override
    public Page<PromotionAgentSettlement> selectPage(Page<PromotionAgentSettlement> page, LambdaQueryWrapper<PromotionAgentSettlement> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgentSettlement entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(PromotionAgentSettlement entity) {
        return mapper.updateById(entity);
    }

    @Override
    public int confirmIfPending(Long id, Long operatorId, java.time.LocalDateTime confirmedAt) {
        return mapper.confirmIfPending(id, operatorId, confirmedAt);
    }
}
