package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.dto.RelationVisitListRow;

import java.time.LocalDateTime;
import java.util.List;

/** 访客展示记录数据访问接口。 */
public interface AppRelationVisitDao extends RelationCrudDao<AppRelationVisit> {
    /** 批量失效指定用户参与的可见访客展示记录。 */
    int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime);
    /** 批量失效指定无序用户对两个方向的可见访客记录。 */
    int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime);

    /** 统计展示窗口内按访问者用户去重的有效访客人数。 */
    long countRecentVisitors(Long userId, LocalDateTime windowStart);

    /** 按普通/VIP可见规则统计实际可分页访客人数。 */
    long countVisibleRecentVisitors(Long userId, boolean vip, LocalDateTime windowStart);

    /** 统计展示窗口内已有用户维度单条解锁的访客人数。 */
    long countUnlockedRecentVisitors(Long userId, LocalDateTime windowStart);

    /** 按访问者聚合并按最近访问时间倒序查询可见页。 */
    List<RelationVisitListRow> selectVisibleRecentVisitors(
            Long userId, boolean vip, LocalDateTime windowStart, long offset, int limit);

    /** 按访问事件快照统计展示窗口内的有效访客人数。 */
    long countRecentVisitorsAtSnapshot(Long userId, LocalDateTime windowStart,
                                       LocalDateTime upperVisitTime, Long upperVisitEventId);

    /** 按访问事件快照和普通/VIP规则统计实际可分页人数。 */
    long countVisibleRecentVisitorsAtSnapshot(Long userId, boolean vip, LocalDateTime windowStart,
                                              LocalDateTime upperVisitTime, Long upperVisitEventId);

    /** 按访问事件快照统计已单条解锁的访客人数。 */
    long countUnlockedRecentVisitorsAtSnapshot(Long userId, LocalDateTime windowStart,
                                               LocalDateTime upperVisitTime, Long upperVisitEventId);

    /** 在固定访问事件快照内分页，避免后续访问被提前展示或确认。 */
    List<RelationVisitListRow> selectVisibleRecentVisitorsAtSnapshot(
            Long userId, boolean vip, LocalDateTime windowStart,
            LocalDateTime upperVisitTime, Long upperVisitEventId, long offset, int limit);
}
