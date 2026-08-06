package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.mapper.IdealFilterSnapshotMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 理想型筛选快照数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class IdealFilterSnapshotDaoImpl implements IdealFilterSnapshotDao {
    private final IdealFilterSnapshotMapper mapper;

    @Override
    public IdealFilterSnapshot selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public IdealFilterSnapshot selectBySnapshotNo(String snapshotNo) {
        return mapper.selectOne(new LambdaQueryWrapper<IdealFilterSnapshot>()
                .eq(IdealFilterSnapshot::getSnapshotNo, snapshotNo)
                .last("LIMIT 1"));
    }

    @Override
    public IdealFilterSnapshot selectByUserAndRequestId(Long userId, String requestId) {
        return mapper.selectOne(new LambdaQueryWrapper<IdealFilterSnapshot>()
                .eq(IdealFilterSnapshot::getUserId, userId)
                .eq(IdealFilterSnapshot::getRequestId, requestId)
                .last("LIMIT 1"));
    }

    @Override
    public Page<IdealFilterSnapshot> selectPage(Page<IdealFilterSnapshot> page,
                                                LambdaQueryWrapper<IdealFilterSnapshot> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(IdealFilterSnapshot entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(IdealFilterSnapshot entity) {
        mapper.updateById(entity);
    }
}
