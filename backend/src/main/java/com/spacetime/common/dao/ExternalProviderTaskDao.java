package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.ExternalProviderTask;

import java.util.List;

public interface ExternalProviderTaskDao {
    ExternalProviderTask selectById(Long id);
    ExternalProviderTask selectOne(LambdaQueryWrapper<ExternalProviderTask> wrapper);
    Page<ExternalProviderTask> selectPage(Page<ExternalProviderTask> page, LambdaQueryWrapper<ExternalProviderTask> wrapper);
    List<ExternalProviderTask> selectList(LambdaQueryWrapper<ExternalProviderTask> wrapper);
    void insert(ExternalProviderTask entity);
    void updateById(ExternalProviderTask entity);
}
