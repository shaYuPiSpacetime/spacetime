package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppRelationVisitInboxStateDao;
import com.spacetime.common.entity.AppRelationVisitInboxState;
import com.spacetime.common.mapper.AppRelationVisitInboxStateMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** 最近访客收件箱读取状态数据访问实现。 */
@Repository
public class AppRelationVisitInboxStateDaoImpl
        extends AbstractRelationCrudDao<AppRelationVisitInboxState>
        implements AppRelationVisitInboxStateDao {
    private final AppRelationVisitInboxStateMapper mapper;

    public AppRelationVisitInboxStateDaoImpl(AppRelationVisitInboxStateMapper mapper) {
        super(mapper);
        this.mapper = mapper;
    }

    @Override
    public AppRelationVisitInboxState selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppRelationVisitInboxState>()
                .eq(AppRelationVisitInboxState::getUserId, userId)
                .last("LIMIT 1"));
    }

    @Override
    public int insertIgnore(Long userId, LocalDateTime visitTime,
                            Long visitEventId, LocalDateTime readAt) {
        return mapper.insertIgnore(userId, visitTime, visitEventId, readAt);
    }

    @Override
    public int advance(Long userId, LocalDateTime visitTime,
                       Long visitEventId, LocalDateTime readAt) {
        return mapper.advance(userId, visitTime, visitEventId, readAt);
    }
}
