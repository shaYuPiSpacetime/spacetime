package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserAsset;

/**
 * 用户资产数据访问接口
 */
public interface UserAssetDao {
    UserAsset selectById(Long id);
    /** 根据用户 ID 查询资产 */
    UserAsset selectByUserId(Long userId);
    Page<UserAsset> selectPage(Page<UserAsset> page, LambdaQueryWrapper<UserAsset> wrapper);
    void insert(UserAsset entity);
    void updateById(UserAsset entity);
    /** 原子更新成家币余额 */
    void updateCoinBalance(Long userId, Integer delta);
    void deleteById(Long id);
}
