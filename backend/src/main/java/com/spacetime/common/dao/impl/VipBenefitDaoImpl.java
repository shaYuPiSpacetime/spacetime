package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.mapper.VipBenefitMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * VIP权益数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class VipBenefitDaoImpl implements VipBenefitDao {
    private final VipBenefitMapper mapper;

    @Override
    public VipBenefit selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<VipBenefit> selectPage(Page<VipBenefit> page, LambdaQueryWrapper<VipBenefit> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(VipBenefit entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(VipBenefit entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
