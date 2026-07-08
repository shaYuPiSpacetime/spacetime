package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserOpenTextAuditDao;
import com.spacetime.common.entity.AppUserOpenTextAudit;
import com.spacetime.common.mapper.AppUserOpenTextAuditMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserOpenTextAuditDaoImpl implements AppUserOpenTextAuditDao {
    private final AppUserOpenTextAuditMapper mapper;

    @Override
    public AppUserOpenTextAudit selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserOpenTextAudit selectOne(LambdaQueryWrapper<AppUserOpenTextAudit> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserOpenTextAudit> selectPage(Page<AppUserOpenTextAudit> page, LambdaQueryWrapper<AppUserOpenTextAudit> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserOpenTextAudit> selectList(LambdaQueryWrapper<AppUserOpenTextAudit> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserOpenTextAudit entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserOpenTextAudit entity) {
        mapper.updateById(entity);
    }
}
