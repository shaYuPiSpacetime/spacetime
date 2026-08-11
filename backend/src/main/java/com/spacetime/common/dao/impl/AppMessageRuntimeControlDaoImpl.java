package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.mapper.AppMessageRuntimeControlMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 消息运行时安全开关数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageRuntimeControlDaoImpl implements AppMessageRuntimeControlDao {
    private final AppMessageRuntimeControlMapper mapper;

    @Override
    public AppMessageRuntimeControl selectByControlKey(String controlKey) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRuntimeControl>()
                .eq(AppMessageRuntimeControl::getControlKey, controlKey));
    }

    @Override
    public AppMessageRuntimeControl selectByControlKeyForUpdate(String controlKey) {
        return mapper.selectByControlKeyForUpdate(controlKey);
    }

    @Override
    public void insert(AppMessageRuntimeControl entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateByVersion(AppMessageRuntimeControl entity, int expectedVersion) {
        return mapper.update(entity, new LambdaUpdateWrapper<AppMessageRuntimeControl>()
                .eq(AppMessageRuntimeControl::getId, entity.getId())
                .eq(AppMessageRuntimeControl::getVersion, expectedVersion));
    }
}
