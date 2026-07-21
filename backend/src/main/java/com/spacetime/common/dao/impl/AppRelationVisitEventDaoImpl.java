package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;
import com.spacetime.common.mapper.AppRelationVisitEventMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** 访客实际事件数据访问实现。 */
@Repository
public class AppRelationVisitEventDaoImpl extends AbstractRelationCrudDao<AppRelationVisitEvent> implements AppRelationVisitEventDao {
    /** 访客事件 Mapper。 */
    private final AppRelationVisitEventMapper visitEventMapper;

    public AppRelationVisitEventDaoImpl(AppRelationVisitEventMapper mapper) {
        super(mapper);
        this.visitEventMapper = mapper;
    }

    @Override
    public RelationVisitStats countTargetStats(Long targetUserId, LocalDateTime startTime) {
        return visitEventMapper.countTargetStats(targetUserId, startTime);
    }
}
