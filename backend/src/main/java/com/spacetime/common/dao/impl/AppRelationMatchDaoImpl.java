package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.mapper.AppRelationMatchMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配生命周期数据访问实现。 */
@Repository
public class AppRelationMatchDaoImpl extends AbstractRelationCrudDao<AppRelationMatch> implements AppRelationMatchDao {
    /** 匹配 Mapper，仅用于带行锁的领域查询。 */
    private final AppRelationMatchMapper matchMapper;

    public AppRelationMatchDaoImpl(AppRelationMatchMapper mapper) {
        super(mapper);
        this.matchMapper = mapper;
    }

    @Override
    public AppRelationMatch selectActivePairForUpdate(Long userLowId, Long userHighId) {
        return matchMapper.selectActivePairForUpdate(userLowId, userHighId);
    }

    @Override
    public AppRelationMatch selectByIdForUpdate(Long matchId) {
        return matchMapper.selectByIdForUpdate(matchId);
    }

    @Override
    public List<AppRelationMatch> selectActiveByUser(Long userId) {
        return matchMapper.selectList(new LambdaQueryWrapper<AppRelationMatch>()
                .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())
                .and(query -> query.eq(AppRelationMatch::getUserLowId, userId)
                        .or().eq(AppRelationMatch::getUserHighId, userId)));
    }

    @Override
    public AppRelationMatch selectActivePair(Long userLowId, Long userHighId) {
        return matchMapper.selectOne(new LambdaQueryWrapper<AppRelationMatch>()
                .eq(AppRelationMatch::getUserLowId, userLowId)
                .eq(AppRelationMatch::getUserHighId, userHighId)
                .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode()));
    }

    @Override
    public int invalidateByIds(List<Long> matchIds, String reason, LocalDateTime invalidTime) {
        if (matchIds == null || matchIds.isEmpty()) {
            return 0;
        }
        return matchMapper.update(new LambdaUpdateWrapper<AppRelationMatch>()
                .in(AppRelationMatch::getId, matchIds)
                .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())
                .set(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.INVALID.getCode())
                .set(AppRelationMatch::getActiveMarker, null)
                .set(AppRelationMatch::getInvalidReason, reason)
                .set(AppRelationMatch::getInvalidTime, invalidTime));
    }

    @Override
    public List<AppRelationMatch> selectActiveMissingConversations(
            LocalDateTime updatedAfter, int limit) {
        return matchMapper.selectActiveMissingConversations(
                updatedAfter, Math.max(1, Math.min(limit, 500)));
    }
}
