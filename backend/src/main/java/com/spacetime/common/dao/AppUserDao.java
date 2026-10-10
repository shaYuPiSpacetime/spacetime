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
    /** 锁定推荐浏览账号的用户行，锁持续至调用方事务提交，串行化同账号额度检查与扣减。 */
    void lockRecommendBrowse(Long userId);
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
