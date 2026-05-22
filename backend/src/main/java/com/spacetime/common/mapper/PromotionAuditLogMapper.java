package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionAuditLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 推广审计日志 Mapper
 */
@Mapper
public interface PromotionAuditLogMapper extends BaseMapper<PromotionAuditLog> {
}
