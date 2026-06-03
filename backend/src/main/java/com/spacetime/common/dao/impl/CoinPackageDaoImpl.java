package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.mapper.CoinPackageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 成家币套餐数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CoinPackageDaoImpl implements CoinPackageDao {
    /** 成家币套餐 MyBatis Mapper */
    private final CoinPackageMapper mapper;

    @Override
    public CoinPackage selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CoinPackage> selectPage(Page<CoinPackage> page, LambdaQueryWrapper<CoinPackage> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(CoinPackage entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CoinPackage entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
