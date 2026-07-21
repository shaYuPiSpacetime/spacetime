package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationLike;

import java.time.LocalDateTime;

/** 喜欢关系数据访问接口。 */
public interface AppRelationLikeDao extends RelationCrudDao<AppRelationLike> {
    /** 批量失效指定用户参与的有效喜欢。 */
    int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime);
    /** 批量失效指定无序用户对两个方向的有效喜欢。 */
    int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime);
}
