package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.VipBenefit;

/**
 * VIP权益数据访问接口
 */
public interface VipBenefitDao {
    VipBenefit selectById(Long id);
    Page<VipBenefit> selectPage(Page<VipBenefit> page, LambdaQueryWrapper<VipBenefit> wrapper);
    void insert(VipBenefit entity);
    void updateById(VipBenefit entity);
    void deleteById(Long id);
}
