package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.mapper.PromotionAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广审计日志数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAuditLogDaoImpl implements PromotionAuditLogDao {
    private final PromotionAuditLogMapper mapper;

    @Override
    public Page<PromotionAuditLog> selectPage(Page<PromotionAuditLog> page, LambdaQueryWrapper<PromotionAuditLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAuditLog entity) {
        mapper.insert(entity);
    }
}
