package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAuditLog;

/**
 * 推广审计日志数据访问接口
 */
public interface PromotionAuditLogDao {
    Page<PromotionAuditLog> selectPage(Page<PromotionAuditLog> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAuditLog> wrapper);
    void insert(PromotionAuditLog entity);
}
