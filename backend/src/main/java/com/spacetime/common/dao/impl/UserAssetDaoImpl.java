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
    public void updateCoinBalance(Long userId, Integer delta) {
        mapper.updateCoinBalance(userId, delta);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
