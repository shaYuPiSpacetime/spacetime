package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserProfileMediaDao;
import com.spacetime.common.entity.AppUserProfileMedia;
import com.spacetime.common.mapper.AppUserProfileMediaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserProfileMediaDaoImpl implements AppUserProfileMediaDao {
    private final AppUserProfileMediaMapper mapper;

    @Override
    public AppUserProfileMedia selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserProfileMedia selectOne(LambdaQueryWrapper<AppUserProfileMedia> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserProfileMedia> selectPage(Page<AppUserProfileMedia> page, LambdaQueryWrapper<AppUserProfileMedia> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserProfileMedia> selectList(LambdaQueryWrapper<AppUserProfileMedia> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserProfileMedia entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserProfileMedia entity) {
        mapper.updateById(entity);
    }
}
