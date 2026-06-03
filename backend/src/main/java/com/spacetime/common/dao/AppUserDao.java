package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUser;

import java.util.List;

/**
 * 小程序用户数据访问接口
 */
public interface AppUserDao {
    AppUser selectById(Long id);
    AppUser selectOne(LambdaQueryWrapper<AppUser> wrapper);
    Page<AppUser> selectPage(Page<AppUser> page, LambdaQueryWrapper<AppUser> wrapper);
    List<AppUser> selectList(LambdaQueryWrapper<AppUser> wrapper);
    void insert(AppUser entity);
    void updateById(AppUser entity);
}
