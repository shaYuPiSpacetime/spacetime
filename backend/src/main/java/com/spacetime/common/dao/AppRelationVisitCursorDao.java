package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationVisitCursor;

/** 访客归并游标数据访问接口。 */
public interface AppRelationVisitCursorDao extends RelationCrudDao<AppRelationVisitCursor> {
    /** 锁定指定有向用户对游标，保证滚动 30 分钟归并并发正确。 */
    AppRelationVisitCursor selectPairForUpdate(Long visitorUserId, Long targetUserId);
}
