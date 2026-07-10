package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserAuditRecord;

import java.util.List;

/**
 * App 用户统一审核记录 DAO。
 */
public interface AppUserAuditRecordDao {
    AppUserAuditRecord selectById(Long id);
    AppUserAuditRecord selectOne(LambdaQueryWrapper<AppUserAuditRecord> wrapper);
    Long count(LambdaQueryWrapper<AppUserAuditRecord> wrapper);
    Page<AppUserAuditRecord> selectPage(Page<AppUserAuditRecord> page, LambdaQueryWrapper<AppUserAuditRecord> wrapper);
    List<AppUserAuditRecord> selectList(LambdaQueryWrapper<AppUserAuditRecord> wrapper);
    void insert(AppUserAuditRecord entity);
    void updateById(AppUserAuditRecord entity);
    void updateAuditResult(AppUserAuditRecord entity);
}
