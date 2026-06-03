package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserVerification;

import java.util.List;

/**
 * 用户认证审核数据访问接口
 */
public interface AppUserVerificationDao {
    AppUserVerification selectById(Long id);
    AppUserVerification selectOne(LambdaQueryWrapper<AppUserVerification> wrapper);
    Page<AppUserVerification> selectPage(Page<AppUserVerification> page, LambdaQueryWrapper<AppUserVerification> wrapper);
    List<AppUserVerification> selectList(LambdaQueryWrapper<AppUserVerification> wrapper);
    void insert(AppUserVerification entity);
    void updateById(AppUserVerification entity);
}
