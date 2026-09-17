package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.VirtualPriceChangeDao;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.mapper.VirtualPriceChangeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 微信虚拟商品改价任务数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class VirtualPriceChangeDaoImpl implements VirtualPriceChangeDao {
    private final VirtualPriceChangeMapper mapper;

    @Override
    public VirtualPriceChange selectLatest(String packageType, Long packageId) {
        return mapper.selectOne(new LambdaQueryWrapper<VirtualPriceChange>()
                .eq(VirtualPriceChange::getPackageType, packageType)
                .eq(VirtualPriceChange::getPackageId, packageId)
                .orderByDesc(VirtualPriceChange::getId)
                .last("LIMIT 1"));
    }

    @Override
    public List<VirtualPriceChange> selectPending(int limit) {
        return mapper.selectPage(new Page<>(1, limit), new LambdaQueryWrapper<VirtualPriceChange>()
                .in(VirtualPriceChange::getStatus, "QUEUED", "UPLOADING", "PUBLISHING", "WAIT_EFFECTIVE")
                .orderByAsc(VirtualPriceChange::getId)).getRecords();
    }

    @Override
    public void insert(VirtualPriceChange entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(VirtualPriceChange entity) {
        mapper.updateById(entity);
    }
}
