package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationLikeInboxState;

import java.time.LocalDateTime;

/** 喜欢收件箱读取状态数据访问接口。 */
public interface AppRelationLikeInboxStateDao extends RelationCrudDao<AppRelationLikeInboxState> {
    AppRelationLikeInboxState selectByUserId(Long userId);

    int insertIgnore(Long userId, LocalDateTime likedTime, Long likeId, LocalDateTime readAt);

    int advance(Long userId, LocalDateTime likedTime, Long likeId, LocalDateTime readAt);
}
