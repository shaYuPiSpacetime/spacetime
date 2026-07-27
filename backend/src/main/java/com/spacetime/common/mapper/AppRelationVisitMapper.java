package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.dto.RelationVisitListRow;
import com.spacetime.common.entity.AppRelationVisit;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/** 访客展示记录 MyBatis Mapper。 */
@Mapper
public interface AppRelationVisitMapper extends BaseMapper<AppRelationVisit> {

    @Select("""
            WITH ranked_visit AS (
                SELECT v.id,
                       v.visitor_user_id,
                       ROW_NUMBER() OVER (
                           PARTITION BY v.visitor_user_id
                           ORDER BY v.last_visit_time DESC, v.id DESC
                       ) AS visitor_rank
                FROM app_relation_visit v
                WHERE v.target_user_id = #{userId}
                  AND v.visit_status = 'visible'
                  AND v.last_visit_time >= #{windowStart}
                  AND v.deleted = 0
            )
            SELECT COUNT(*)
            FROM ranked_visit
            WHERE visitor_rank = 1
            """)
    long countRecentVisitors(@Param("userId") Long userId,
                             @Param("windowStart") LocalDateTime windowStart);

    @Select("""
            WITH ranked_visit AS (
                SELECT v.id,
                       v.visit_no,
                       v.visitor_user_id,
                       v.last_visit_time,
                       ROW_NUMBER() OVER (
                           PARTITION BY v.visitor_user_id
                           ORDER BY v.last_visit_time DESC, v.id DESC
                       ) AS visitor_rank
                FROM app_relation_visit v
                WHERE v.target_user_id = #{userId}
                  AND v.visit_status = 'visible'
                  AND v.last_visit_time >= #{windowStart}
                  AND v.deleted = 0
            ),
            active_unlock AS (
                SELECT target_user_id, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'visit'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_user_id
            ),
            base_visitor AS (
                SELECT rv.id,
                       rv.visit_no,
                       rv.visitor_user_id,
                       rv.last_visit_time,
                       u.unlock_time
                FROM ranked_visit rv
                LEFT JOIN active_unlock u ON u.target_user_id = rv.visitor_user_id
                WHERE rv.visitor_rank = 1
            ),
            ranked_access AS (
                SELECT b.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY CASE WHEN b.unlock_time IS NULL THEN 1 ELSE 0 END
                           ORDER BY b.last_visit_time DESC, b.id DESC
                       ) AS locked_rank
                FROM base_visitor b
            )
            SELECT COUNT(*)
            FROM ranked_access
            WHERE #{vip} = TRUE
               OR unlock_time IS NOT NULL
               OR locked_rank <= 10
            """)
    long countVisibleRecentVisitors(@Param("userId") Long userId,
                                    @Param("vip") boolean vip,
                                    @Param("windowStart") LocalDateTime windowStart);

    @Select("""
            WITH recent_visitor AS (
                SELECT DISTINCT v.visitor_user_id
                FROM app_relation_visit v
                WHERE v.target_user_id = #{userId}
                  AND v.visit_status = 'visible'
                  AND v.last_visit_time >= #{windowStart}
                  AND v.deleted = 0
            )
            SELECT COUNT(DISTINCT rv.visitor_user_id)
            FROM recent_visitor rv
            INNER JOIN app_user_unlock_record u
                    ON u.target_user_id = rv.visitor_user_id
                   AND u.user_id = #{userId}
                   AND u.target_biz_type = 'visit'
                   AND u.status = 'active'
                   AND u.active_marker = 1
                   AND u.deleted = 0
            """)
    long countUnlockedRecentVisitors(@Param("userId") Long userId,
                                     @Param("windowStart") LocalDateTime windowStart);

    @Select("""
            WITH ranked_visit AS (
                SELECT v.id,
                       v.visit_no,
                       v.visitor_user_id,
                       v.source_scene,
                       MIN(v.first_visit_time) OVER (
                           PARTITION BY v.visitor_user_id
                       ) AS first_visit_time,
                       MAX(v.last_visit_time) OVER (
                           PARTITION BY v.visitor_user_id
                       ) AS last_visit_time,
                       SUM(v.pv_count) OVER (
                           PARTITION BY v.visitor_user_id
                       ) AS visit_count,
                       ROW_NUMBER() OVER (
                           PARTITION BY v.visitor_user_id
                           ORDER BY v.last_visit_time DESC, v.id DESC
                       ) AS visitor_rank
                FROM app_relation_visit v
                WHERE v.target_user_id = #{userId}
                  AND v.visit_status = 'visible'
                  AND v.last_visit_time >= #{windowStart}
                  AND v.deleted = 0
            ),
            active_unlock AS (
                SELECT target_user_id, MAX(effective_time) AS unlock_time
                FROM app_user_unlock_record
                WHERE user_id = #{userId}
                  AND target_biz_type = 'visit'
                  AND status = 'active'
                  AND active_marker = 1
                  AND deleted = 0
                GROUP BY target_user_id
            ),
            base_visitor AS (
                SELECT rv.id,
                       rv.visit_no,
                       rv.visitor_user_id,
                       rv.source_scene,
                       rv.first_visit_time,
                       rv.last_visit_time,
                       rv.visit_count,
                       u.unlock_time
                FROM ranked_visit rv
                LEFT JOIN active_unlock u ON u.target_user_id = rv.visitor_user_id
                WHERE rv.visitor_rank = 1
            ),
            ranked_access AS (
                SELECT b.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY CASE WHEN b.unlock_time IS NULL THEN 1 ELSE 0 END
                           ORDER BY b.last_visit_time DESC, b.id DESC
                       ) AS locked_rank
                FROM base_visitor b
            ),
            visible_visitor AS (
                SELECT *
                FROM ranked_access
                WHERE #{vip} = TRUE
                   OR unlock_time IS NOT NULL
                   OR locked_rank <= 10
            )
            SELECT id,
                   visit_no AS visitNo,
                   visitor_user_id AS visitorUserId,
                   source_scene AS sourceScene,
                   first_visit_time AS firstVisitTime,
                   last_visit_time AS lastVisitTime,
                   visit_count AS visitCount,
                   unlock_time AS unlockTime
            FROM visible_visitor
            ORDER BY last_visit_time DESC, id DESC
            LIMIT #{limit} OFFSET #{offset}
            """)
    List<RelationVisitListRow> selectVisibleRecentVisitors(
            @Param("userId") Long userId,
            @Param("vip") boolean vip,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("offset") long offset,
            @Param("limit") int limit);
}
