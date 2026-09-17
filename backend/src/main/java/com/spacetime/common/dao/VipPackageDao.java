package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.VipPackage;

/**
 * VIP套餐数据访问接口
 */
public interface VipPackageDao {
    VipPackage selectById(Long id);
    /** 在当前事务内锁住套餐行，防止与商品切换并发。 */
    VipPackage selectForUpdate(Long id);
    Page<VipPackage> selectPage(Page<VipPackage> page, LambdaQueryWrapper<VipPackage> wrapper);
    void insert(VipPackage entity);
    void updateById(VipPackage entity);
    void deleteById(Long id);
}
