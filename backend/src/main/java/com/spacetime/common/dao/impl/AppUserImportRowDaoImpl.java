package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.entity.AppUserImportRow;
import com.spacetime.common.mapper.AppUserImportRowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserImportRowDaoImpl implements AppUserImportRowDao {
    private final AppUserImportRowMapper mapper;

    @Override
    public AppUserImportRow selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserImportRow selectOne(LambdaQueryWrapper<AppUserImportRow> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserImportRow> selectPage(Page<AppUserImportRow> page, LambdaQueryWrapper<AppUserImportRow> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserImportRow> selectList(LambdaQueryWrapper<AppUserImportRow> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserImportRow entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserImportRow entity) {
        mapper.updateById(entity);
    }
}
