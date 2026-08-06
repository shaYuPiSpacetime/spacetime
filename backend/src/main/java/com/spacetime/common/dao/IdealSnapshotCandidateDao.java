package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.IdealSnapshotCandidate;

import java.util.List;

/** 理想型快照候选数据访问接口。 */
public interface IdealSnapshotCandidateDao {
    IdealSnapshotCandidate selectByItemNo(String itemNo);
    List<IdealSnapshotCandidate> selectByItemNos(Long snapshotId, List<String> itemNos);
    List<IdealSnapshotCandidate> selectBySnapshotId(Long snapshotId);
    Page<IdealSnapshotCandidate> selectPage(Page<IdealSnapshotCandidate> page,
                                            LambdaQueryWrapper<IdealSnapshotCandidate> wrapper);
    void insert(IdealSnapshotCandidate entity);
    void insertBatch(List<IdealSnapshotCandidate> entities);
}
