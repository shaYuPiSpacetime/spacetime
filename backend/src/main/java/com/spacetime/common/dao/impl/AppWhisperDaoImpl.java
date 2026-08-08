package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppWhisperDao;
import com.spacetime.common.entity.AppWhisper;
import com.spacetime.common.mapper.AppWhisperMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 悄悄话数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppWhisperDaoImpl implements AppWhisperDao {
    private final AppWhisperMapper mapper;

    @Override
    public AppWhisper selectBySenderAndIdempotencyKey(Long senderUserId, String idempotencyKey) {
        return mapper.selectOne(new LambdaQueryWrapper<AppWhisper>()
                .eq(AppWhisper::getSenderUserId, senderUserId)
                .eq(AppWhisper::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
    }

    @Override
    public AppWhisper selectBySenderAndIdempotencyKeyForUpdate(Long senderUserId, String idempotencyKey) {
        return mapper.selectBySenderAndIdempotencyKeyForUpdate(senderUserId, idempotencyKey);
    }

    @Override
    public void insert(AppWhisper entity) {
        mapper.insert(entity);
    }
}
