package com.spacetime.common.dao;

import com.spacetime.common.entity.AppRelationMatchSource;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配来源明细数据访问接口。 */
public interface AppRelationMatchSourceDao extends RelationCrudDao<AppRelationMatchSource> {
    /** 按主键锁定来源明细，避免同一来源重复撤销覆盖状态。 */
    AppRelationMatchSource selectByIdForUpdate(Long sourceId);
    /** 按匹配主键批量失效仍有效的来源。 */
    int invalidateActiveByMatchIds(List<Long> matchIds, String reason, LocalDateTime invalidTime);
}
