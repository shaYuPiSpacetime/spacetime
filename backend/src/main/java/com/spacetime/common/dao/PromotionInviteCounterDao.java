package com.spacetime.common.dao;

import com.spacetime.common.entity.PromotionInviteCounter;

/**
 * 推广邀请计数器数据访问接口。
 */
public interface PromotionInviteCounterDao {
    PromotionInviteCounter selectForUpdate(String sourceType, Long rewardObjectId);
    void insert(PromotionInviteCounter entity);
    int increment(Long id);
}
