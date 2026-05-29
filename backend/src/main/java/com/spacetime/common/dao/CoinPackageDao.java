package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CoinPackage;

/**
 * 成家币套餐数据访问接口
 */
public interface CoinPackageDao {
    CoinPackage selectById(Long id);
    Page<CoinPackage> selectPage(Page<CoinPackage> page, LambdaQueryWrapper<CoinPackage> wrapper);
    void insert(CoinPackage entity);
    void updateById(CoinPackage entity);
    void deleteById(Long id);
}
