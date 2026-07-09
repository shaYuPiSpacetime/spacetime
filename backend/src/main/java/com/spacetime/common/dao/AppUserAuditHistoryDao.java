package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserAuditHistory;

import java.util.List;

/**
 * App 用户审核历史 DAO。
 */
public interface AppUserAuditHistoryDao {
    AppUserAuditHistory selectById(Long id);
    AppUserAuditHistory selectOne(LambdaQueryWrapper<AppUserAuditHistory> wrapper);
    Page<AppUserAuditHistory> selectPage(Page<AppUserAuditHistory> page, LambdaQueryWrapper<AppUserAuditHistory> wrapper);
    List<AppUserAuditHistory> selectList(LambdaQueryWrapper<AppUserAuditHistory> wrapper);
    void insert(AppUserAuditHistory entity);
    void updateById(AppUserAuditHistory entity);
}
