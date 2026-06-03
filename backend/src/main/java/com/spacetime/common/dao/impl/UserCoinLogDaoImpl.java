package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.mapper.UserCoinLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 成家币流水数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class UserCoinLogDaoImpl implements UserCoinLogDao {
    /** 成家币流水 MyBatis Mapper */
    private final UserCoinLogMapper mapper;

    @Override
    public UserCoinLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<UserCoinLog> selectPage(Page<UserCoinLog> page, LambdaQueryWrapper<UserCoinLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public Page<UserCoinLog> selectPageByUserId(Page<UserCoinLog> page, Long userId) {
        LambdaQueryWrapper<UserCoinLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserCoinLog::getUserId, userId)
                .orderByDesc(UserCoinLog::getCreateTime);
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(UserCoinLog entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(UserCoinLog entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
