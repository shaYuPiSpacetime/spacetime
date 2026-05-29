package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.mapper.UserUnlockRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 用户解锁记录数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class UserUnlockRecordDaoImpl implements UserUnlockRecordDao {
    private final UserUnlockRecordMapper mapper;

    @Override
    public UserUnlockRecord selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<UserUnlockRecord> selectPage(Page<UserUnlockRecord> page, LambdaQueryWrapper<UserUnlockRecord> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(UserUnlockRecord entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(UserUnlockRecord entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
