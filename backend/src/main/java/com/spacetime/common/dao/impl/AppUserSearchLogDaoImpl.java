package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserSearchLogDao;
import com.spacetime.common.entity.AppUserSearchLog;
import com.spacetime.common.mapper.AppUserSearchLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserSearchLogDaoImpl implements AppUserSearchLogDao {
    private final AppUserSearchLogMapper mapper;

    @Override
    public long countByUserId(Long userId) {
        return mapper.selectCount(new LambdaQueryWrapper<AppUserSearchLog>().eq(AppUserSearchLog::getUserId, userId));
    }

    @Override
    public void insert(AppUserSearchLog entity) {
        mapper.insert(entity);
    }
}
