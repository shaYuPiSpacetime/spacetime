package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dto.RelationVisitListRow;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.mapper.AppRelationVisitMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 访客展示记录数据访问实现。 */
@Repository
public class AppRelationVisitDaoImpl extends AbstractRelationCrudDao<AppRelationVisit> implements AppRelationVisitDao {
    private final AppRelationVisitMapper visitMapper;

    public AppRelationVisitDaoImpl(AppRelationVisitMapper mapper) {
        super(mapper);
        this.visitMapper = mapper;
    }

    @Override
    public int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime) {
        return visitMapper.update(invalidWrapper(reason, invalidTime)
                .and(query -> query.eq(AppRelationVisit::getVisitorUserId, userId)
                        .or().eq(AppRelationVisit::getTargetUserId, userId)));
    }

    @Override
    public int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime) {
        return visitMapper.update(invalidWrapper(reason, invalidTime)
                .and(query -> query.and(pair -> pair.eq(AppRelationVisit::getVisitorUserId, userLowId)
                                .eq(AppRelationVisit::getTargetUserId, userHighId))
                        .or(pair -> pair.eq(AppRelationVisit::getVisitorUserId, userHighId)
                                .eq(AppRelationVisit::getTargetUserId, userLowId))));
    }

    @Override
    public long countRecentVisitors(Long userId, LocalDateTime windowStart) {
        return visitMapper.countRecentVisitors(userId, windowStart);
    }

    @Override
    public long countVisibleRecentVisitors(Long userId, boolean vip, LocalDateTime windowStart) {
        return visitMapper.countVisibleRecentVisitors(userId, vip, windowStart);
    }

    @Override
    public long countUnlockedRecentVisitors(Long userId, LocalDateTime windowStart) {
        return visitMapper.countUnlockedRecentVisitors(userId, windowStart);
    }

    @Override
    public List<RelationVisitListRow> selectVisibleRecentVisitors(
            Long userId, boolean vip, LocalDateTime windowStart, long offset, int limit) {
        return visitMapper.selectVisibleRecentVisitors(userId, vip, windowStart, offset, limit);
    }

    private LambdaUpdateWrapper<AppRelationVisit> invalidWrapper(String reason, LocalDateTime invalidTime) {
        return new LambdaUpdateWrapper<AppRelationVisit>()
                .eq(AppRelationVisit::getVisitStatus, RelationVisitStatusEnum.VISIBLE.getCode())
                .set(AppRelationVisit::getVisitStatus, RelationVisitStatusEnum.INVALID.getCode())
                .set(AppRelationVisit::getInvalidReason, reason)
                .set(AppRelationVisit::getInvalidTime, invalidTime);
    }
}
