package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppRelationVisitCursor;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 访客归并游标 MyBatis Mapper。 */
@Mapper
public interface AppRelationVisitCursorMapper extends BaseMapper<AppRelationVisitCursor> {
    /** 锁定指定有向用户对的游标行。 */
    @Select("SELECT * FROM app_relation_visit_cursor WHERE visitor_user_id=#{visitorUserId} "
            + "AND target_user_id=#{targetUserId} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppRelationVisitCursor selectPairForUpdate(@Param("visitorUserId") Long visitorUserId,
                                               @Param("targetUserId") Long targetUserId);
}
