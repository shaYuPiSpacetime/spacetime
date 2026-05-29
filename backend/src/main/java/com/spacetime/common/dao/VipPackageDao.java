package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.VipPackage;

/**
 * VIP套餐数据访问接口
 */
public interface VipPackageDao {
    VipPackage selectById(Long id);
    Page<VipPackage> selectPage(Page<VipPackage> page, LambdaQueryWrapper<VipPackage> wrapper);
    void insert(VipPackage entity);
    void updateById(VipPackage entity);
    void deleteById(Long id);
}
