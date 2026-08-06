package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.mapper.IdealSnapshotCandidateMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 理想型快照候选数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class IdealSnapshotCandidateDaoImpl implements IdealSnapshotCandidateDao {
    private final IdealSnapshotCandidateMapper mapper;

    @Override
    public IdealSnapshotCandidate selectByItemNo(String itemNo) {
        return mapper.selectOne(new LambdaQueryWrapper<IdealSnapshotCandidate>()
                .eq(IdealSnapshotCandidate::getItemNo, itemNo)
                .last("LIMIT 1"));
    }

    @Override
    public List<IdealSnapshotCandidate> selectByItemNos(Long snapshotId, List<String> itemNos) {
        if (itemNos == null || itemNos.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(new LambdaQueryWrapper<IdealSnapshotCandidate>()
                .eq(IdealSnapshotCandidate::getSnapshotId, snapshotId)
                .in(IdealSnapshotCandidate::getItemNo, itemNos));
    }

    @Override
    public List<IdealSnapshotCandidate> selectBySnapshotId(Long snapshotId) {
        return mapper.selectList(new LambdaQueryWrapper<IdealSnapshotCandidate>()
                .eq(IdealSnapshotCandidate::getSnapshotId, snapshotId)
                .orderByDesc(IdealSnapshotCandidate::getSortTime)
                .orderByAsc(IdealSnapshotCandidate::getSortTieBreaker));
    }

    @Override
    public Page<IdealSnapshotCandidate> selectPage(Page<IdealSnapshotCandidate> page,
                                                   LambdaQueryWrapper<IdealSnapshotCandidate> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(IdealSnapshotCandidate entity) {
        mapper.insert(entity);
    }

    @Override
    public void insertBatch(List<IdealSnapshotCandidate> entities) {
        if (entities == null) {
            return;
        }
        entities.forEach(mapper::insert);
    }
}
