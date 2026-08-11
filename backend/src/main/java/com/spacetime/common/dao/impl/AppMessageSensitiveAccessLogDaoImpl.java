package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppMessageSensitiveAccessLogDao;
import com.spacetime.common.entity.AppMessageSensitiveAccessLog;
import com.spacetime.common.mapper.AppMessageSensitiveAccessLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 敏感正文访问审计数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageSensitiveAccessLogDaoImpl implements AppMessageSensitiveAccessLogDao {
    private final AppMessageSensitiveAccessLogMapper mapper;

    @Override
    public AppMessageSensitiveAccessLog selectByAccessNo(String accessNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageSensitiveAccessLog>()
                .eq(AppMessageSensitiveAccessLog::getAccessNo, accessNo));
    }

    @Override
    public Page<AppMessageSensitiveAccessLog> selectPage(Page<AppMessageSensitiveAccessLog> page,
                                                          LambdaQueryWrapper<AppMessageSensitiveAccessLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(AppMessageSensitiveAccessLog entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateResult(Long id, String result, String denyReasonCode) {
        return mapper.update(null, new LambdaUpdateWrapper<AppMessageSensitiveAccessLog>()
                .eq(AppMessageSensitiveAccessLog::getId, id)
                .eq(AppMessageSensitiveAccessLog::getResult, "pending")
                .set(AppMessageSensitiveAccessLog::getResult, result)
                .set(AppMessageSensitiveAccessLog::getDenyReasonCode, denyReasonCode));
    }
}
