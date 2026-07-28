package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.PromotionInviteCounterDao;
import com.spacetime.common.entity.PromotionInviteCounter;
import com.spacetime.common.mapper.PromotionInviteCounterMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广邀请计数器数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionInviteCounterDaoImpl implements PromotionInviteCounterDao {
    private final PromotionInviteCounterMapper mapper;

    @Override
    public PromotionInviteCounter selectForUpdate(String sourceType, Long rewardObjectId) {
        return mapper.selectForUpdate(sourceType, rewardObjectId);
    }

    @Override
    public void insert(PromotionInviteCounter entity) {
        mapper.insert(entity);
    }

    @Override
    public int increment(Long id) {
        return mapper.increment(id);
    }
}
