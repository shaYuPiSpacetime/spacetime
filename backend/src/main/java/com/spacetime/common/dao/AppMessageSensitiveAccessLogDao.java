package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppMessageSensitiveAccessLog;

/** 敏感正文访问审计数据访问接口。 */
public interface AppMessageSensitiveAccessLogDao {
    AppMessageSensitiveAccessLog selectByAccessNo(String accessNo);
    Page<AppMessageSensitiveAccessLog> selectPage(Page<AppMessageSensitiveAccessLog> page,
                                                  LambdaQueryWrapper<AppMessageSensitiveAccessLog> wrapper);
    void insert(AppMessageSensitiveAccessLog entity);
    int updateResult(Long id, String result, String denyReasonCode);
}
