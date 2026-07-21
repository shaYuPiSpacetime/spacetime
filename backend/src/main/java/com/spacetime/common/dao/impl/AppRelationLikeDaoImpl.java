package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.mapper.AppRelationLikeMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** 喜欢关系数据访问实现。 */
@Repository
public class AppRelationLikeDaoImpl extends AbstractRelationCrudDao<AppRelationLike> implements AppRelationLikeDao {
    private final AppRelationLikeMapper likeMapper;

    public AppRelationLikeDaoImpl(AppRelationLikeMapper mapper) {
        super(mapper);
        this.likeMapper = mapper;
    }

    @Override
    public int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime) {
        return likeMapper.update(invalidWrapper(reason, invalidTime)
                .and(query -> query.eq(AppRelationLike::getFromUserId, userId)
                        .or().eq(AppRelationLike::getToUserId, userId)));
    }

    @Override
    public int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime) {
        return likeMapper.update(invalidWrapper(reason, invalidTime)
                .and(query -> query.and(pair -> pair.eq(AppRelationLike::getFromUserId, userLowId)
                                .eq(AppRelationLike::getToUserId, userHighId))
                        .or(pair -> pair.eq(AppRelationLike::getFromUserId, userHighId)
                                .eq(AppRelationLike::getToUserId, userLowId))));
    }

    private LambdaUpdateWrapper<AppRelationLike> invalidWrapper(String reason, LocalDateTime invalidTime) {
        return new LambdaUpdateWrapper<AppRelationLike>()
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .set(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.INVALID.getCode())
                .set(AppRelationLike::getActiveMarker, null)
                .set(AppRelationLike::getInvalidReason, reason)
                .set(AppRelationLike::getInvalidTime, invalidTime);
    }
}
