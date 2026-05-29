package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserUnlockRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户解锁记录 Mapper
 */
@Mapper
public interface UserUnlockRecordMapper extends BaseMapper<UserUnlockRecord> {
}
