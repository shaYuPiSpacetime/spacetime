package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationVisit;

import java.time.LocalDateTime;

/** 访客展示记录数据访问接口。 */
public interface AppRelationVisitDao extends RelationCrudDao<AppRelationVisit> {
    /** 批量失效指定用户参与的可见访客展示记录。 */
    int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime);
    /** 批量失效指定无序用户对两个方向的可见访客记录。 */
    int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime);
}
