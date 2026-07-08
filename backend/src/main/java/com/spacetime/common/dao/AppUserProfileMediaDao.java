package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserProfileMedia;

import java.util.List;

public interface AppUserProfileMediaDao {
    AppUserProfileMedia selectById(Long id);
    AppUserProfileMedia selectOne(LambdaQueryWrapper<AppUserProfileMedia> wrapper);
    Page<AppUserProfileMedia> selectPage(Page<AppUserProfileMedia> page, LambdaQueryWrapper<AppUserProfileMedia> wrapper);
    List<AppUserProfileMedia> selectList(LambdaQueryWrapper<AppUserProfileMedia> wrapper);
    void insert(AppUserProfileMedia entity);
    void updateById(AppUserProfileMedia entity);
}
