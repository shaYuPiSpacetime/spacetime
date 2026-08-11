package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUser;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 小程序用户数据访问接口
 */
public interface AppUserDao {
    AppUser selectById(Long id);
    List<AppUser> selectByIds(List<Long> ids);
    AppUser selectByPhoneHash(String phoneHash);
    AppUser selectOne(LambdaQueryWrapper<AppUser> wrapper);
    Long count(LambdaQueryWrapper<AppUser> wrapper);
    Page<AppUser> selectPage(Page<AppUser> page, LambdaQueryWrapper<AppUser> wrapper);
    List<AppUser> selectList(LambdaQueryWrapper<AppUser> wrapper);
    List<AppUser> selectRestrictedWithoutMessage(LocalDateTime updatedAfter, int limit);
    void insert(AppUser entity);
    void updateById(AppUser entity);
}
