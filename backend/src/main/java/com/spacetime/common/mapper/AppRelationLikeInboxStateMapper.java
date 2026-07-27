package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppRelationLikeInboxState;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/** 喜欢收件箱读取状态 Mapper。 */
@Mapper
public interface AppRelationLikeInboxStateMapper extends BaseMapper<AppRelationLikeInboxState> {

    @Insert("""
            INSERT IGNORE INTO app_relation_like_inbox_state
                (user_id, last_read_liked_time, last_read_like_id, read_at,
                 create_time, update_time, created_by, updated_by, deleted)
            VALUES
                (#{userId}, #{likedTime}, #{likeId}, #{readAt},
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, #{userId}, #{userId}, 0)
            """)
    int insertIgnore(@Param("userId") Long userId,
                     @Param("likedTime") LocalDateTime likedTime,
                     @Param("likeId") Long likeId,
                     @Param("readAt") LocalDateTime readAt);

    @Update("""
            UPDATE app_relation_like_inbox_state
            SET last_read_liked_time = #{likedTime},
                last_read_like_id = #{likeId},
                read_at = #{readAt},
                update_time = CURRENT_TIMESTAMP,
                updated_by = #{userId}
            WHERE user_id = #{userId}
              AND deleted = 0
              AND (
                    last_read_liked_time IS NULL
                    OR last_read_liked_time < #{likedTime}
                    OR (last_read_liked_time = #{likedTime} AND last_read_like_id < #{likeId})
              )
            """)
    int advance(@Param("userId") Long userId,
                @Param("likedTime") LocalDateTime likedTime,
                @Param("likeId") Long likeId,
                @Param("readAt") LocalDateTime readAt);
}
