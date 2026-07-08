package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.mapper.ExternalProviderTaskMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ExternalProviderTaskDaoImpl implements ExternalProviderTaskDao {
    private final ExternalProviderTaskMapper mapper;

    @Override
    public ExternalProviderTask selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public ExternalProviderTask selectOne(LambdaQueryWrapper<ExternalProviderTask> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<ExternalProviderTask> selectPage(Page<ExternalProviderTask> page, LambdaQueryWrapper<ExternalProviderTask> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<ExternalProviderTask> selectList(LambdaQueryWrapper<ExternalProviderTask> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(ExternalProviderTask entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(ExternalProviderTask entity) {
        mapper.updateById(entity);
    }
}
