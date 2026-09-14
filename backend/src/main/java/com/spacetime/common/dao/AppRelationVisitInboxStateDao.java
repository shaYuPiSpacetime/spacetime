package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationVisitInboxState;

import java.time.LocalDateTime;

/** 最近访客收件箱读取状态数据访问接口。 */
public interface AppRelationVisitInboxStateDao extends RelationCrudDao<AppRelationVisitInboxState> {
    AppRelationVisitInboxState selectByUserId(Long userId);

    int insertIgnore(Long userId, LocalDateTime visitTime, Long visitEventId, LocalDateTime readAt);

    int advance(Long userId, LocalDateTime visitTime, Long visitEventId, LocalDateTime readAt);
}
