package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dto.RelationLikeListRow;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.mapper.AppRelationLikeMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

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

    @Override
    public long countVisibleIncomingLikes(Long userId, boolean vip,
                                          LocalDateTime snapshotLikedTime, Long snapshotLikeId) {
        return likeMapper.countVisibleIncomingLikes(userId, vip, snapshotLikedTime, snapshotLikeId);
    }

    @Override
    public List<RelationLikeListRow> selectVisibleIncomingLikes(
            Long userId, boolean vip,
            LocalDateTime lastReadLikedTime, Long lastReadLikeId,
            LocalDateTime snapshotLikedTime, Long snapshotLikeId,
            long offset, int limit) {
        return likeMapper.selectVisibleIncomingLikes(
                userId, vip, lastReadLikedTime, lastReadLikeId,
                snapshotLikedTime, snapshotLikeId, offset, limit);
    }

    @Override
    public List<RelationLikeListRow> selectNewIncomingLikePreviews(
            Long userId,
            LocalDateTime lastReadLikedTime, Long lastReadLikeId,
            LocalDateTime snapshotLikedTime, Long snapshotLikeId,
            int limit) {
        return likeMapper.selectNewIncomingLikePreviews(
                userId, lastReadLikedTime, lastReadLikeId,
                snapshotLikedTime, snapshotLikeId, limit);
    }

    @Override
    public RelationLikeListRow selectLatestIncomingLike(Long userId) {
        return likeMapper.selectLatestIncomingLike(userId);
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
