package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.dto.RelationLikeListRow;

import java.time.LocalDateTime;
import java.util.List;

/** 喜欢关系数据访问接口。 */
public interface AppRelationLikeDao extends RelationCrudDao<AppRelationLike> {
    /** 批量失效指定用户参与的有效喜欢。 */
    int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime);
    /** 批量失效指定无序用户对两个方向的有效喜欢。 */
    int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime);

    /** 按普通/VIP可见规则统计实际可分页数量。 */
    long countVisibleIncomingLikes(Long userId, boolean vip,
                                   LocalDateTime snapshotLikedTime, Long snapshotLikeId);

    /** 新喜欢优先、之后按解锁和喜欢时间排序查询可见页。 */
    List<RelationLikeListRow> selectVisibleIncomingLikes(
            Long userId, boolean vip,
            LocalDateTime lastReadLikedTime, Long lastReadLikeId,
            LocalDateTime snapshotLikedTime, Long snapshotLikeId,
            long offset, int limit);

    /** 查询快照内最多五条最新新喜欢头像投影。 */
    List<RelationLikeListRow> selectNewIncomingLikePreviews(
            Long userId,
            LocalDateTime lastReadLikedTime, Long lastReadLikeId,
            LocalDateTime snapshotLikedTime, Long snapshotLikeId,
            int limit);
}
