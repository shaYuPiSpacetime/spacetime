package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserUnlockRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 用户解锁记录 Mapper
 */
@Mapper
public interface UserUnlockRecordMapper extends BaseMapper<UserUnlockRecord> {

    @Select("""
            SELECT *
            FROM app_user_unlock_record
            WHERE user_id = #{userId}
              AND target_biz_type = #{targetBizType}
              AND target_user_id = #{targetUserId}
              AND status = 'active'
              AND active_marker = 1
              AND (expire_time IS NULL OR expire_time > NOW())
              AND deleted = 0
            ORDER BY effective_time DESC, id DESC
            LIMIT 1
            """)
    UserUnlockRecord selectActiveByTargetUser(@Param("userId") Long userId,
                                              @Param("targetBizType") String targetBizType,
                                              @Param("targetUserId") Long targetUserId);
}
