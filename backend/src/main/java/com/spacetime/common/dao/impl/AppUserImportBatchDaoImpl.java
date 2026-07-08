package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.entity.AppUserImportBatch;
import com.spacetime.common.mapper.AppUserImportBatchMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserImportBatchDaoImpl implements AppUserImportBatchDao {
    private final AppUserImportBatchMapper mapper;

    @Override
    public AppUserImportBatch selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserImportBatch selectOne(LambdaQueryWrapper<AppUserImportBatch> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserImportBatch> selectPage(Page<AppUserImportBatch> page, LambdaQueryWrapper<AppUserImportBatch> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserImportBatch> selectList(LambdaQueryWrapper<AppUserImportBatch> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserImportBatch entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserImportBatch entity) {
        mapper.updateById(entity);
    }
}
