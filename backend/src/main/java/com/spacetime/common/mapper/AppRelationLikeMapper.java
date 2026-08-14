package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.dto.RelationLikeListRow;
import com.spacetime.common.entity.AppRelationLike;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/** 喜欢关系 MyBatis Mapper。 */
@Mapper
public interface AppRelationLikeMapper extends BaseMapper<AppRelationLike> {

    @Select("""
            <script>
            WITH active_unlock AS (
                SELECT target_biz_no, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'like'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_biz_no
            ),
            base_like AS (
                SELECT l.id, l.like_no, l.from_user_id, l.source_scene, l.liked_time,
                       u.unlock_time
                FROM app_relation_like l
                LEFT JOIN active_unlock u ON u.target_biz_no = l.like_no
                WHERE l.to_user_id = #{userId}
                  AND l.like_status = 'active'
                  AND l.active_marker = 1
                  AND l.deleted = 0
                  <if test="snapshotLikedTime != null and snapshotLikeId != null">
                  AND (
                        l.liked_time &lt; #{snapshotLikedTime}
                        OR (l.liked_time = #{snapshotLikedTime} AND l.id &lt;= #{snapshotLikeId})
                  )
                  </if>
            ),
            ranked_like AS (
                SELECT b.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY CASE WHEN b.unlock_time IS NULL THEN 1 ELSE 0 END
                           ORDER BY b.liked_time DESC, b.id DESC
                       ) AS locked_rank
                FROM base_like b
            )
            SELECT COUNT(*)
            FROM ranked_like
            WHERE #{vip} = TRUE
               OR unlock_time IS NOT NULL
               OR locked_rank &lt;= 10
            </script>
            """)
    long countVisibleIncomingLikes(@Param("userId") Long userId,
                                   @Param("vip") boolean vip,
                                   @Param("snapshotLikedTime") LocalDateTime snapshotLikedTime,
                                   @Param("snapshotLikeId") Long snapshotLikeId);

    @Select("""
            <script>
            WITH active_unlock AS (
                SELECT target_biz_no, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'like'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_biz_no
            ),
            base_like AS (
                SELECT l.id, l.like_no, l.from_user_id, l.source_scene, l.liked_time,
                       u.unlock_time,
                       CASE
                           WHEN #{lastReadLikedTime} IS NULL THEN 1
                           WHEN l.liked_time &gt; #{lastReadLikedTime} THEN 1
                           WHEN l.liked_time = #{lastReadLikedTime}
                                AND l.id &gt; COALESCE(#{lastReadLikeId}, 0) THEN 1
                           ELSE 0
                       END AS is_new
                FROM app_relation_like l
                LEFT JOIN active_unlock u ON u.target_biz_no = l.like_no
                WHERE l.to_user_id = #{userId}
                  AND l.like_status = 'active'
                  AND l.active_marker = 1
                  AND l.deleted = 0
                  <if test="snapshotLikedTime != null and snapshotLikeId != null">
                  AND (
                        l.liked_time &lt; #{snapshotLikedTime}
                        OR (l.liked_time = #{snapshotLikedTime} AND l.id &lt;= #{snapshotLikeId})
                  )
                  </if>
            ),
            ranked_like AS (
                SELECT b.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY CASE WHEN b.unlock_time IS NULL THEN 1 ELSE 0 END
                           ORDER BY b.liked_time DESC, b.id DESC
                       ) AS locked_rank
                FROM base_like b
            ),
            visible_like AS (
                SELECT *
                FROM ranked_like
                WHERE #{vip} = TRUE
                   OR unlock_time IS NOT NULL
                   OR locked_rank &lt;= 10
            )
            SELECT id,
                   like_no AS likeNo,
                   from_user_id AS fromUserId,
                   source_scene AS sourceScene,
                   liked_time AS likedTime,
                   unlock_time AS unlockTime,
                   CASE WHEN is_new = 1 THEN TRUE ELSE FALSE END AS newLike
            FROM visible_like
            ORDER BY
                CASE
                    WHEN is_new = 1 THEN 0
                    WHEN unlock_time IS NOT NULL THEN 1
                    ELSE 2
                END ASC,
                CASE WHEN is_new = 1 THEN liked_time END DESC,
                CASE WHEN is_new = 1 THEN id END DESC,
                CASE WHEN is_new = 0 AND unlock_time IS NOT NULL THEN unlock_time END DESC,
                CASE WHEN is_new = 0 AND unlock_time IS NOT NULL THEN liked_time END DESC,
                CASE WHEN is_new = 0 AND unlock_time IS NOT NULL THEN id END DESC,
                CASE WHEN is_new = 0 AND unlock_time IS NULL THEN liked_time END DESC,
                CASE WHEN is_new = 0 AND unlock_time IS NULL THEN id END DESC
            LIMIT #{limit} OFFSET #{offset}
            </script>
            """)
    List<RelationLikeListRow> selectVisibleIncomingLikes(
            @Param("userId") Long userId,
            @Param("vip") boolean vip,
            @Param("lastReadLikedTime") LocalDateTime lastReadLikedTime,
            @Param("lastReadLikeId") Long lastReadLikeId,
            @Param("snapshotLikedTime") LocalDateTime snapshotLikedTime,
            @Param("snapshotLikeId") Long snapshotLikeId,
            @Param("offset") long offset,
            @Param("limit") int limit);

    @Select("""
            <script>
            WITH active_unlock AS (
                SELECT target_biz_no, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'like'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_biz_no
            )
            SELECT l.id,
                   l.like_no AS likeNo,
                   l.from_user_id AS fromUserId,
                   l.source_scene AS sourceScene,
                   l.liked_time AS likedTime,
                   u.unlock_time AS unlockTime,
                   TRUE AS newLike
            FROM app_relation_like l
            LEFT JOIN active_unlock u ON u.target_biz_no = l.like_no
            WHERE l.to_user_id = #{userId}
              AND l.like_status = 'active'
              AND l.active_marker = 1
              AND l.deleted = 0
              AND (
                    #{lastReadLikedTime} IS NULL
                    OR l.liked_time &gt; #{lastReadLikedTime}
                    OR (l.liked_time = #{lastReadLikedTime}
                        AND l.id &gt; COALESCE(#{lastReadLikeId}, 0))
              )
              <if test="snapshotLikedTime != null and snapshotLikeId != null">
              AND (
                    l.liked_time &lt; #{snapshotLikedTime}
                    OR (l.liked_time = #{snapshotLikedTime} AND l.id &lt;= #{snapshotLikeId})
              )
              </if>
            ORDER BY l.liked_time DESC, l.id DESC
            LIMIT #{limit}
            </script>
            """)
    List<RelationLikeListRow> selectNewIncomingLikePreviews(
            @Param("userId") Long userId,
            @Param("lastReadLikedTime") LocalDateTime lastReadLikedTime,
            @Param("lastReadLikeId") Long lastReadLikeId,
            @Param("snapshotLikedTime") LocalDateTime snapshotLikedTime,
            @Param("snapshotLikeId") Long snapshotLikeId,
            @Param("limit") int limit);

    @Select("""
            SELECT l.id,
                   l.like_no AS likeNo,
                   l.from_user_id AS fromUserId,
                   l.source_scene AS sourceScene,
                   l.liked_time AS likedTime,
                   u.unlock_time AS unlockTime,
                   FALSE AS newLike
            FROM app_relation_like l
            LEFT JOIN (
                SELECT target_biz_no, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'like'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_biz_no
            ) u ON u.target_biz_no = l.like_no
            WHERE l.to_user_id = #{userId}
              AND l.like_status = 'active'
              AND l.active_marker = 1
              AND l.deleted = 0
            ORDER BY l.liked_time DESC, l.id DESC
            LIMIT 1
            """)
    RelationLikeListRow selectLatestIncomingLike(@Param("userId") Long userId);
}
