package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.entity.AppRelationMatchSource;
import com.spacetime.common.enums.RelationMatchSourceStatusEnum;
import com.spacetime.common.mapper.AppRelationMatchSourceMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配来源明细数据访问实现。 */
@Repository
public class AppRelationMatchSourceDaoImpl extends AbstractRelationCrudDao<AppRelationMatchSource> implements AppRelationMatchSourceDao {
    private final AppRelationMatchSourceMapper sourceMapper;

    public AppRelationMatchSourceDaoImpl(AppRelationMatchSourceMapper mapper) {
        super(mapper);
        this.sourceMapper = mapper;
    }

    @Override
    public AppRelationMatchSource selectByIdForUpdate(Long sourceId) {
        return sourceMapper.selectByIdForUpdate(sourceId);
    }

    @Override
    public int invalidateActiveByMatchIds(List<Long> matchIds, String reason, LocalDateTime invalidTime) {
        if (matchIds == null || matchIds.isEmpty()) {
            return 0;
        }
        return sourceMapper.update(new LambdaUpdateWrapper<AppRelationMatchSource>()
                .in(AppRelationMatchSource::getMatchId, matchIds)
                .eq(AppRelationMatchSource::getSourceStatus, RelationMatchSourceStatusEnum.ACTIVE.getCode())
                .set(AppRelationMatchSource::getSourceStatus, RelationMatchSourceStatusEnum.INVALID.getCode())
                .set(AppRelationMatchSource::getRevokedTime, invalidTime)
                .set(AppRelationMatchSource::getInvalidReason, reason));
    }
}
