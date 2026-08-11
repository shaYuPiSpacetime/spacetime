package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppRelationMatch;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 匹配生命周期 MyBatis Mapper。 */
@Mapper
public interface AppRelationMatchMapper extends BaseMapper<AppRelationMatch> {
    /** 锁定无序用户对当前有效匹配。 */
    @Select("SELECT * FROM app_relation_match WHERE user_low_id=#{userLowId} AND user_high_id=#{userHighId} "
            + "AND match_status='matched' AND active_marker=1 AND deleted=0 LIMIT 1 FOR UPDATE")
    AppRelationMatch selectActivePairForUpdate(@Param("userLowId") Long userLowId,
                                               @Param("userHighId") Long userHighId);

    /** 按主键锁定匹配生命周期。 */
    @Select("SELECT * FROM app_relation_match WHERE id=#{matchId} AND deleted=0 FOR UPDATE")
    AppRelationMatch selectByIdForUpdate(@Param("matchId") Long matchId);

    /** 查询近期缺失私信会话投影的有效匹配。 */
    @Select("SELECT m.* FROM app_relation_match m "
            + "LEFT JOIN app_message_conversation c ON c.match_id=m.id AND c.deleted=0 "
            + "WHERE m.match_status='matched' AND m.active_marker=1 AND m.deleted=0 "
            + "AND m.update_time>=#{updatedAfter} AND c.id IS NULL "
            + "ORDER BY m.update_time,m.id LIMIT #{limit}")
    java.util.List<AppRelationMatch> selectActiveMissingConversations(
            @Param("updatedAfter") java.time.LocalDateTime updatedAfter,
            @Param("limit") int limit);
}
