package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationMatchPopup;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配弹窗用户状态数据访问接口。 */
public interface AppRelationMatchPopupDao extends RelationCrudDao<AppRelationMatchPopup> {
    /** 将指定匹配仍待展示的双方弹窗批量标记为已取消。 */
    int cancelPendingByMatchId(Long matchId, LocalDateTime cancelledTime);
    /** 将多个匹配仍待展示的弹窗批量标记为已取消。 */
    int cancelPendingByMatchIds(List<Long> matchIds, LocalDateTime cancelledTime);
}
