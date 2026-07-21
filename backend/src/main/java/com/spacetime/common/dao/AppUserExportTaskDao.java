package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserExportTask;

import java.util.List;

public interface AppUserExportTaskDao {
    AppUserExportTask selectById(Long id);
    AppUserExportTask selectOne(LambdaQueryWrapper<AppUserExportTask> wrapper);
    Page<AppUserExportTask> selectPage(Page<AppUserExportTask> page, LambdaQueryWrapper<AppUserExportTask> wrapper);
    List<AppUserExportTask> selectList(LambdaQueryWrapper<AppUserExportTask> wrapper);
    void insert(AppUserExportTask entity);
    void updateById(AppUserExportTask entity);
}
