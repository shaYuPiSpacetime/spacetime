package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserUnlockRecord;

/**
 * 用户解锁记录数据访问接口
 */
public interface UserUnlockRecordDao {
    UserUnlockRecord selectById(Long id);
    Page<UserUnlockRecord> selectPage(Page<UserUnlockRecord> page, LambdaQueryWrapper<UserUnlockRecord> wrapper);
    void insert(UserUnlockRecord entity);
    void updateById(UserUnlockRecord entity);
    void deleteById(Long id);
}
