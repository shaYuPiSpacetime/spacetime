package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserImportBatch;

import java.util.List;

public interface AppUserImportBatchDao {
    AppUserImportBatch selectById(Long id);
    AppUserImportBatch selectOne(LambdaQueryWrapper<AppUserImportBatch> wrapper);
    Page<AppUserImportBatch> selectPage(Page<AppUserImportBatch> page, LambdaQueryWrapper<AppUserImportBatch> wrapper);
    List<AppUserImportBatch> selectList(LambdaQueryWrapper<AppUserImportBatch> wrapper);
    void insert(AppUserImportBatch entity);
    void updateById(AppUserImportBatch entity);
}
