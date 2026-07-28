package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionRewardLog;

/**
 * 奖励流水数据访问接口
 */
public interface PromotionRewardLogDao {
    PromotionRewardLog selectById(Long id);
    PromotionRewardLog selectByIdForUpdate(Long id);
    PromotionRewardLog selectByRewardNo(String rewardNo);
    PromotionRewardLog selectByIdempotencyKey(String idempotencyKey);
    Page<PromotionRewardLog> selectPage(Page<PromotionRewardLog> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionRewardLog> wrapper);
    void insert(PromotionRewardLog entity);
    int updateById(PromotionRewardLog entity);
}
