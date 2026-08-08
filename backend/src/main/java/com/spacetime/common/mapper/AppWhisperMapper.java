package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppWhisper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 悄悄话 MyBatis Mapper。 */
@Mapper
public interface AppWhisperMapper extends BaseMapper<AppWhisper> {
    /** 资产锁获取后使用当前读检查并发事务已提交的幂等记录。 */
    @Select("SELECT * FROM app_whisper "
            + "WHERE sender_user_id = #{senderUserId} AND idempotency_key = #{idempotencyKey} "
            + "AND deleted = 0 LIMIT 1 FOR UPDATE")
    AppWhisper selectBySenderAndIdempotencyKeyForUpdate(
            @Param("senderUserId") Long senderUserId,
            @Param("idempotencyKey") String idempotencyKey);
}
