package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserUnlockRecord;

import java.util.List;

/**
 * 用户解锁记录数据访问接口
 */
public interface UserUnlockRecordDao {
    UserUnlockRecord selectById(Long id);
    /** 按条件批量查询解锁记录。 */
    List<UserUnlockRecord> selectList(LambdaQueryWrapper<UserUnlockRecord> wrapper);
    /** 按被解锁用户查询有效权益，访客跨展示记录复用。 */
    UserUnlockRecord selectActiveByTargetUser(Long userId, String targetBizType, Long targetUserId);
    Page<UserUnlockRecord> selectPage(Page<UserUnlockRecord> page, LambdaQueryWrapper<UserUnlockRecord> wrapper);
    void insert(UserUnlockRecord entity);
    void updateById(UserUnlockRecord entity);
    void deleteById(Long id);
}
