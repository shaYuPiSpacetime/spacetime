package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserOpenTextAudit;

import java.util.List;

public interface AppUserOpenTextAuditDao {
    AppUserOpenTextAudit selectById(Long id);
    AppUserOpenTextAudit selectOne(LambdaQueryWrapper<AppUserOpenTextAudit> wrapper);
    Page<AppUserOpenTextAudit> selectPage(Page<AppUserOpenTextAudit> page, LambdaQueryWrapper<AppUserOpenTextAudit> wrapper);
    List<AppUserOpenTextAudit> selectList(LambdaQueryWrapper<AppUserOpenTextAudit> wrapper);
    void insert(AppUserOpenTextAudit entity);
    void updateById(AppUserOpenTextAudit entity);
}
