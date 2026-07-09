package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUserAuditRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * App 用户统一审核记录 Mapper。
 */
@Mapper
public interface AppUserAuditRecordMapper extends BaseMapper<AppUserAuditRecord> {
}
