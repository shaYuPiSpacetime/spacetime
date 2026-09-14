package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

/** 访客实际事件 MyBatis Mapper。 */
@Mapper
public interface AppRelationVisitEventMapper extends BaseMapper<AppRelationVisitEvent> {
    @Select("""
            SELECT *
              FROM app_relation_visit_event
             WHERE target_user_id = #{targetUserId}
               AND deleted = 0
               AND visit_time <= #{requestTime}
             ORDER BY visit_time DESC, id DESC
             LIMIT 1
            """)
    AppRelationVisitEvent selectLatestTargetVisitAtOrBefore(
            @Param("targetUserId") Long targetUserId,
            @Param("requestTime") LocalDateTime requestTime);

    @Select("""
            <script>
            SELECT COUNT(DISTINCT visitor_user_id)
              FROM app_relation_visit_event
             WHERE target_user_id = #{targetUserId}
               AND deleted = 0
               AND visit_time &gt;= #{dayStart}
               AND visit_time &lt; #{dayEnd}
               <if test="lowerTime != null and lowerId != null">
                 AND (visit_time &gt; #{lowerTime}
                      OR (visit_time = #{lowerTime} AND id &gt; #{lowerId}))
               </if>
               AND (visit_time &lt; #{upperTime}
                    OR (visit_time = #{upperTime} AND id &lt;= #{upperId}))
            </script>
            """)
    Long countDistinctTargetVisitorsBetween(
            @Param("targetUserId") Long targetUserId,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd,
            @Param("lowerTime") LocalDateTime lowerTime,
            @Param("lowerId") Long lowerId,
            @Param("upperTime") LocalDateTime upperTime,
            @Param("upperId") Long upperId);

    /** 精确统计最近访问事件，重试事件由 event_no 唯一约束保证不重复。 */
    @Select("""
            SELECT COUNT(DISTINCT visitor_user_id) AS uv, COUNT(*) AS pv
            FROM app_relation_visit_event
            WHERE target_user_id = #{targetUserId}
              AND visit_time >= #{startTime}
              AND deleted = 0
            """)
    // 按实际访问事件统计历史 UV/PV；关系后续失效不改写已经发生的访问指标。
    RelationVisitStats countTargetStats(@Param("targetUserId") Long targetUserId,
                                        @Param("startTime") LocalDateTime startTime);

    /** 按请求时刻与事件元组上界统计固定快照内的访客 UV/PV。 */
    @Select("""
            <script>
            SELECT COUNT(DISTINCT visitor_user_id) AS uv, COUNT(*) AS pv
              FROM app_relation_visit_event
             WHERE target_user_id = #{targetUserId}
               AND visit_time &gt;= #{startTime}
               AND visit_time &lt;= #{requestTime}
               AND deleted = 0
               <if test="upperVisitTime != null and upperVisitEventId != null">
                 AND (visit_time &lt; #{upperVisitTime}
                      OR (visit_time = #{upperVisitTime} AND id &lt;= #{upperVisitEventId}))
               </if>
            </script>
            """)
    RelationVisitStats countTargetStatsAtSnapshot(
            @Param("targetUserId") Long targetUserId,
            @Param("startTime") LocalDateTime startTime,
            @Param("requestTime") LocalDateTime requestTime,
            @Param("upperVisitTime") LocalDateTime upperVisitTime,
            @Param("upperVisitEventId") Long upperVisitEventId);

    /** 统计最近实际访问过任意用户主页的全站去重访客数。 */
    @Select("""
            SELECT COUNT(DISTINCT visitor_user_id)
            FROM app_relation_visit_event
            WHERE visit_time >= #{startTime}
              AND deleted = 0
            """)
    Long countDistinctVisitorsSince(@Param("startTime") LocalDateTime startTime);
}
