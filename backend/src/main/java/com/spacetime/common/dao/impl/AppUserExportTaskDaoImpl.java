package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.entity.AppUserExportTask;
import com.spacetime.common.mapper.AppUserExportTaskMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserExportTaskDaoImpl implements AppUserExportTaskDao {
    private final AppUserExportTaskMapper mapper;

    @Override
    public AppUserExportTask selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserExportTask selectOne(LambdaQueryWrapper<AppUserExportTask> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserExportTask> selectPage(Page<AppUserExportTask> page, LambdaQueryWrapper<AppUserExportTask> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserExportTask> selectList(LambdaQueryWrapper<AppUserExportTask> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserExportTask entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserExportTask entity) {
        mapper.updateById(entity);
    }
}
