package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommercialConfigLogDao;
import com.spacetime.common.entity.CommercialConfigLog;
import com.spacetime.common.mapper.CommercialConfigLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 商业化配置变更审计数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CommercialConfigLogDaoImpl implements CommercialConfigLogDao {
    /** 商业化配置变更审计 Mapper */
    private final CommercialConfigLogMapper mapper;

    @Override
    public CommercialConfigLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CommercialConfigLog> selectPage(Page<CommercialConfigLog> page, LambdaQueryWrapper<CommercialConfigLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(CommercialConfigLog entity) {
        mapper.insert(entity);
    }
}
