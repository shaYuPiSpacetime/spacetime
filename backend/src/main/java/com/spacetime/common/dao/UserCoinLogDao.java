package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserCoinLog;

/**
 * 成家币流水数据访问接口
 */
public interface UserCoinLogDao {
    UserCoinLog selectById(Long id);
    Page<UserCoinLog> selectPage(Page<UserCoinLog> page, LambdaQueryWrapper<UserCoinLog> wrapper);
    /** 分页查询用户流水 */
    Page<UserCoinLog> selectPageByUserId(Page<UserCoinLog> page, Long userId);
    void insert(UserCoinLog entity);
    void updateById(UserCoinLog entity);
    void deleteById(Long id);
}
