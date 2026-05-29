package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserRelationBlock;

import java.util.List;

public interface AppUserRelationBlockDao {
    AppUserRelationBlock selectById(Long id);
    AppUserRelationBlock selectActive(Long userId, Long targetUserId, String blockType);
    List<AppUserRelationBlock> selectActiveByUserId(Long userId, String blockType);
    Page<AppUserRelationBlock> selectPageByUserId(Page<AppUserRelationBlock> page, Long userId, String blockType);
    long countActiveByUserId(Long userId, String blockType);
    void insert(AppUserRelationBlock entity);
    void updateById(AppUserRelationBlock entity);
}
