package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.mapper.AppUserAuditHistoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * App 用户审核历史 DAO 实现。
 */
@Repository
@RequiredArgsConstructor
public class AppUserAuditHistoryDaoImpl implements AppUserAuditHistoryDao {
    private final AppUserAuditHistoryMapper mapper;

    @Override
    public AppUserAuditHistory selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserAuditHistory selectOne(LambdaQueryWrapper<AppUserAuditHistory> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserAuditHistory> selectPage(Page<AppUserAuditHistory> page, LambdaQueryWrapper<AppUserAuditHistory> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserAuditHistory> selectList(LambdaQueryWrapper<AppUserAuditHistory> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserAuditHistory entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserAuditHistory entity) {
        mapper.updateById(entity);
    }
}
