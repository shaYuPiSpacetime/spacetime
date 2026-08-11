package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityEventOutbox;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface CommunityEventOutboxMapper extends BaseMapper<CommunityEventOutbox> {
    @Select("SELECT * FROM community_event_outbox WHERE deleted=0 "
            + "AND event_type IN ('report_result','moderation_result','community_interaction_summary',"
            + "'community_hot_topic','featured_content','community_activity','community_recall') AND "
            + "(status='pending' OR (status='failed' AND next_retry_at<=#{now}) "
            + "OR (status='sending' AND update_time<=#{staleBefore})) "
            + "ORDER BY create_time,id LIMIT #{limit}")
    List<CommunityEventOutbox> selectClaimable(@Param("now") LocalDateTime now,
                                                @Param("staleBefore") LocalDateTime staleBefore,
                                                @Param("limit") int limit);

    @Update("UPDATE community_event_outbox SET status='sending', update_time=#{now} "
            + "WHERE id=#{id} AND deleted=0 "
            + "AND event_type IN ('report_result','moderation_result','community_interaction_summary',"
            + "'community_hot_topic','featured_content','community_activity','community_recall') AND "
            + "(status='pending' OR (status='failed' AND next_retry_at<=#{now}) "
            + "OR (status='sending' AND update_time<=#{staleBefore}))")
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now,
              @Param("staleBefore") LocalDateTime staleBefore);

    @Update("UPDATE community_event_outbox SET status='sent', sent_at=#{sentAt}, "
            + "next_retry_at=NULL, last_error=NULL, update_time=#{sentAt} "
            + "WHERE id=#{id} AND status='sending' AND deleted=0")
    int markSent(@Param("id") Long id, @Param("sentAt") LocalDateTime sentAt);

    @Update("UPDATE community_event_outbox SET status=#{status}, retry_count=#{retryCount}, "
            + "next_retry_at=#{nextRetryAt}, last_error=#{lastError}, update_time=#{now} "
            + "WHERE id=#{id} AND status='sending' AND deleted=0")
    int markFailure(@Param("id") Long id,
                    @Param("retryCount") int retryCount,
                    @Param("status") String status,
                    @Param("nextRetryAt") LocalDateTime nextRetryAt,
                    @Param("lastError") String lastError,
                    @Param("now") LocalDateTime now);
}
