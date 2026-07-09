package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUserAuditHistory;
import org.apache.ibatis.annotations.Mapper;

/**
 * App 用户审核历史 Mapper。
 */
@Mapper
public interface AppUserAuditHistoryMapper extends BaseMapper<AppUserAuditHistory> {
}
