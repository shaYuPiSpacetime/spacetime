package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserRelationBlock;

import java.util.Collection;
import java.util.List;

public interface AppUserRelationBlockDao {
    AppUserRelationBlock selectById(Long id);
    AppUserRelationBlock selectActive(Long userId, Long targetUserId, String blockType);
    List<AppUserRelationBlock> selectActiveByUserId(Long userId, String blockType);
    /** 批量查询当前用户与候选用户之间的有效屏蔽关系，供列表场景消除逐行查询。 */
    List<AppUserRelationBlock> selectActiveBetweenUserAndTargets(
            Long userId, Collection<Long> targetUserIds, Collection<String> blockTypes);
    Page<AppUserRelationBlock> selectPageByUserId(Page<AppUserRelationBlock> page, Long userId, String blockType);
    long countActiveByUserId(Long userId, String blockType);
    void insert(AppUserRelationBlock entity);
    void updateById(AppUserRelationBlock entity);
}
