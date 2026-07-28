package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionEventInbox;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/**
 * 推广事实事件收件箱 Mapper。
 */
@Mapper
public interface PromotionEventInboxMapper extends BaseMapper<PromotionEventInbox> {

    @Select("SELECT * FROM promotion_event_inbox WHERE event_key = #{eventKey} AND deleted = 0 LIMIT 1")
    PromotionEventInbox selectByEventKey(@Param("eventKey") String eventKey);

    @Update("""
            UPDATE promotion_event_inbox
               SET status = 'processing',
                   update_time = #{now},
                   updated_by = NULL
             WHERE id = #{id}
               AND deleted = 0
               AND (
                    status = 'pending'
                    OR (status = 'failed' AND next_retry_time IS NOT NULL AND next_retry_time <= #{now})
                    OR (status = 'processing' AND update_time <= #{staleBefore})
               )
            """)
    int claim(@Param("id") Long id,
              @Param("now") LocalDateTime now,
              @Param("staleBefore") LocalDateTime staleBefore);
}
