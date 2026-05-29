package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserSearchLog;

public interface AppUserSearchLogDao {
    long countByUserId(Long userId);
    void insert(AppUserSearchLog entity);
}
