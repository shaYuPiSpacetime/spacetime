package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.mapper.AppRelationVisitMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

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

    private LambdaUpdateWrapper<AppRelationVisit> invalidWrapper(String reason, LocalDateTime invalidTime) {
        return new LambdaUpdateWrapper<AppRelationVisit>()
                .eq(AppRelationVisit::getVisitStatus, RelationVisitStatusEnum.VISIBLE.getCode())
                .set(AppRelationVisit::getVisitStatus, RelationVisitStatusEnum.INVALID.getCode())
                .set(AppRelationVisit::getInvalidReason, reason)
                .set(AppRelationVisit::getInvalidTime, invalidTime);
    }
}
