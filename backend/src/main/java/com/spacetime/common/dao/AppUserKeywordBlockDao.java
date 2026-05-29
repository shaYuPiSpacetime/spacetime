package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserKeywordBlock;

import java.util.List;

public interface AppUserKeywordBlockDao {
    AppUserKeywordBlock selectById(Long id);
    AppUserKeywordBlock selectActiveByUserAndKeyword(Long userId, String keyword);
    List<AppUserKeywordBlock> selectActiveByUserId(Long userId);
    long countActiveByUserId(Long userId);
    void insert(AppUserKeywordBlock entity);
    void updateById(AppUserKeywordBlock entity);
}
