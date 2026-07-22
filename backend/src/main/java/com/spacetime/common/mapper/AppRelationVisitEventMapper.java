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
}
