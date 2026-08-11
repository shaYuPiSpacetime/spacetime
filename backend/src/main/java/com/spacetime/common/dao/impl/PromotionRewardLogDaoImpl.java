package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.mapper.PromotionRewardLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 奖励流水数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionRewardLogDaoImpl implements PromotionRewardLogDao {
    private final PromotionRewardLogMapper mapper;

    @Override
    public PromotionRewardLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionRewardLog selectByIdForUpdate(Long id) {
        return mapper.selectByIdForUpdate(id);
    }

    @Override
    public PromotionRewardLog selectByRewardNo(String rewardNo) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionRewardLog>()
                .eq(PromotionRewardLog::getRewardNo, rewardNo));
    }

    @Override
    public PromotionRewardLog selectByIdempotencyKey(String idempotencyKey) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionRewardLog>()
                .eq(PromotionRewardLog::getIdempotencyKey, idempotencyKey));
    }

    @Override
    public Page<PromotionRewardLog> selectPage(Page<PromotionRewardLog> page, LambdaQueryWrapper<PromotionRewardLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public java.util.List<PromotionRewardLog> selectTerminalWithoutMessage(
            java.time.LocalDateTime updatedAfter, int limit) {
        return mapper.selectTerminalWithoutMessage(updatedAfter,
                Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public void insert(PromotionRewardLog entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(PromotionRewardLog entity) {
        return mapper.updateById(entity);
    }
}
