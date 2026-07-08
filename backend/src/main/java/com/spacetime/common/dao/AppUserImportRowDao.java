package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserImportRow;

import java.util.List;

public interface AppUserImportRowDao {
    AppUserImportRow selectById(Long id);
    AppUserImportRow selectOne(LambdaQueryWrapper<AppUserImportRow> wrapper);
    Page<AppUserImportRow> selectPage(Page<AppUserImportRow> page, LambdaQueryWrapper<AppUserImportRow> wrapper);
    List<AppUserImportRow> selectList(LambdaQueryWrapper<AppUserImportRow> wrapper);
    void insert(AppUserImportRow entity);
    void updateById(AppUserImportRow entity);
}
