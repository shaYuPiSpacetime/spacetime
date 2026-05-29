package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.mapper.VipPackageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * VIP套餐数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class VipPackageDaoImpl implements VipPackageDao {
    private final VipPackageMapper mapper;

    @Override
    public VipPackage selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<VipPackage> selectPage(Page<VipPackage> page, LambdaQueryWrapper<VipPackage> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(VipPackage entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(VipPackage entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
