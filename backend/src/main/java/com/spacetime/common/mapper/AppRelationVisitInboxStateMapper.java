package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppRelationVisitInboxState;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/** 最近访客收件箱读取状态 Mapper。 */
@Mapper
public interface AppRelationVisitInboxStateMapper extends BaseMapper<AppRelationVisitInboxState> {

    @Insert("""
            INSERT IGNORE INTO app_relation_visit_inbox_state
                (user_id, last_read_visit_time, last_read_visit_event_id, read_at,
                 create_time, update_time, created_by, updated_by, deleted)
            VALUES
                (#{userId}, #{visitTime}, #{visitEventId}, #{readAt},
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, #{userId}, #{userId}, 0)
            """)
    int insertIgnore(@Param("userId") Long userId,
                     @Param("visitTime") LocalDateTime visitTime,
                     @Param("visitEventId") Long visitEventId,
                     @Param("readAt") LocalDateTime readAt);

    @Update("""
            UPDATE app_relation_visit_inbox_state
               SET last_read_visit_time = #{visitTime},
                   last_read_visit_event_id = #{visitEventId},
                   read_at = #{readAt},
                   update_time = CURRENT_TIMESTAMP,
                   updated_by = #{userId}
             WHERE user_id = #{userId}
               AND deleted = 0
               AND (
                    last_read_visit_time IS NULL
                    OR last_read_visit_time < #{visitTime}
                    OR (last_read_visit_time = #{visitTime}
                        AND last_read_visit_event_id < #{visitEventId})
               )
            """)
    int advance(@Param("userId") Long userId,
                @Param("visitTime") LocalDateTime visitTime,
                @Param("visitEventId") Long visitEventId,
                @Param("readAt") LocalDateTime readAt);
}
