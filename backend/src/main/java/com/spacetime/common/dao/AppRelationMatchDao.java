package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationMatch;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配生命周期数据访问接口。 */
public interface AppRelationMatchDao extends RelationCrudDao<AppRelationMatch> {
    /** 锁定无序用户对当前有效匹配，保证同一时间最多一条有效生命周期。 */
    AppRelationMatch selectActivePairForUpdate(Long userLowId, Long userHighId);
    /** 按主键锁定匹配生命周期，串行化同一生命周期的来源撤销。 */
    AppRelationMatch selectByIdForUpdate(Long matchId);
    /** 查询指定用户参与的全部有效匹配。 */
    List<AppRelationMatch> selectActiveByUser(Long userId);
    /** 查询指定无序用户对的有效匹配。 */
    AppRelationMatch selectActivePair(Long userLowId, Long userHighId);
    /** 按匹配主键批量失效有效生命周期。 */
    int invalidateByIds(List<Long> matchIds, String reason, LocalDateTime invalidTime);
}
