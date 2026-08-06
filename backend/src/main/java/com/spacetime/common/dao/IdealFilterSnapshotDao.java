package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.IdealFilterSnapshot;

/** 理想型筛选快照数据访问接口。 */
public interface IdealFilterSnapshotDao {
    IdealFilterSnapshot selectById(Long id);
    IdealFilterSnapshot selectBySnapshotNo(String snapshotNo);
    IdealFilterSnapshot selectByUserAndRequestId(Long userId, String requestId);
    Page<IdealFilterSnapshot> selectPage(Page<IdealFilterSnapshot> page,
                                         LambdaQueryWrapper<IdealFilterSnapshot> wrapper);
    void insert(IdealFilterSnapshot entity);
    void updateById(IdealFilterSnapshot entity);
}
