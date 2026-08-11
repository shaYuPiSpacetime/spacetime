package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.mapper.UserAssetMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 用户资产数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class UserAssetDaoImpl implements UserAssetDao {
    /** 用户资产 MyBatis Mapper */
    private final UserAssetMapper mapper;

    @Override
    public UserAsset selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public UserAsset selectByUserId(Long userId) {
        LambdaQueryWrapper<UserAsset> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserAsset::getUserId, userId);
        return mapper.selectOne(wrapper);
    }

    @Override
    public UserAsset selectByUserIdForUpdate(Long userId) {
        return mapper.selectByUserIdForUpdate(userId);
    }

    @Override
    public int consumeFreeWhisper(Long userId) {
        return mapper.consumeFreeWhisper(userId);
    }

    @Override
    public int updateFreeWhisperProjection(Long userId, Integer remain) {
        return mapper.updateFreeWhisperProjection(userId, remain);
    }

    @Override
    public Page<UserAsset> selectPage(Page<UserAsset> page, LambdaQueryWrapper<UserAsset> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(UserAsset entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(UserAsset entity) {
        mapper.updateById(entity);
    }

    @Override
    public int updateCoinBalance(Long userId, Integer delta) {
        return mapper.updateCoinBalance(userId, delta);
    }

    @Override
    public int updateRechargeStats(Long userId, java.math.BigDecimal amount, java.time.LocalDateTime purchaseTime) {
        return mapper.updateRechargeStats(userId, amount, purchaseTime);
    }

    @Override
    public int updateLastConsumeTime(Long userId, java.time.LocalDateTime consumeTime) {
        return mapper.updateLastConsumeTime(userId, consumeTime);
    }

    @Override
    public int expireVipMemberships(java.time.LocalDateTime expireBefore) {
        return mapper.expireVipMemberships(expireBefore);
    }

    @Override
    public int expireVipMembership(Long userId, java.time.LocalDateTime expireBefore) {
        return mapper.expireVipMembership(userId, expireBefore);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
