package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageEventInbox;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

/** 消息事件 Inbox 原子认领和临时载荷清理 Mapper。 */
@Mapper
public interface AppMessageEventInboxMapper extends BaseMapper<AppMessageEventInbox> {
    @Select("SELECT * FROM app_message_event_inbox WHERE deleted=0 AND "
            + "(status='pending' OR (status='failed' AND next_retry_time<=#{now}) "
            + "OR (status='processing' AND processing_started_at<=#{staleBefore})) "
            + "ORDER BY create_time,id LIMIT #{limit}")
    List<AppMessageEventInbox> selectClaimable(@Param("now") LocalDateTime now,
                                                @Param("staleBefore") LocalDateTime staleBefore,
                                                @Param("limit") int limit);

    @Update("UPDATE app_message_event_inbox SET status='processing', processing_started_at=#{now}, "
            + "update_time=#{now} WHERE id=#{id} AND deleted=0 AND "
            + "(status='pending' OR (status='failed' AND next_retry_time<=#{now}) "
            + "OR (status='processing' AND processing_started_at<=#{staleBefore}))")
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now,
              @Param("staleBefore") LocalDateTime staleBefore);

    @Update("UPDATE app_message_event_inbox SET status='success', processed_at=#{processedAt}, "
            + "payload_ciphertext=NULL, payload_iv=NULL, payload_key_version=NULL, payload_hmac=NULL, "
            + "payload_cleared_at=CASE WHEN payload_cleared_at IS NULL THEN #{processedAt} "
            + "ELSE payload_cleared_at END, next_retry_time=NULL, last_error_code=NULL, "
            + "last_error_summary=NULL, update_time=#{processedAt} "
            + "WHERE id=#{id} AND status='processing' AND deleted=0")
    int markSuccessAndClearPayload(@Param("id") Long id,
                                   @Param("processedAt") LocalDateTime processedAt);

    @Update("<script>UPDATE app_message_event_inbox SET status=#{status}, retry_count=#{retryCount}, "
            + "next_retry_time=#{nextRetryTime}, last_error_code=#{errorCode}, "
            + "last_error_summary=#{errorSummary}, "
            + "payload_ciphertext=CASE WHEN #{dead}=1 THEN NULL ELSE payload_ciphertext END, "
            + "payload_iv=CASE WHEN #{dead}=1 THEN NULL ELSE payload_iv END, "
            + "payload_key_version=CASE WHEN #{dead}=1 THEN NULL ELSE payload_key_version END, "
            + "payload_hmac=CASE WHEN #{dead}=1 THEN NULL ELSE payload_hmac END, "
            + "payload_cleared_at=CASE WHEN #{dead}=1 AND payload_cleared_at IS NULL THEN #{now} "
            + "ELSE payload_cleared_at END, update_time=#{now} "
            + "WHERE id=#{id} AND status='processing' AND deleted=0</script>")
    int markFailure(@Param("id") Long id,
                    @Param("retryCount") int retryCount,
                    @Param("status") String status,
                    @Param("dead") int dead,
                    @Param("nextRetryTime") LocalDateTime nextRetryTime,
                    @Param("errorCode") String errorCode,
                    @Param("errorSummary") String errorSummary,
                    @Param("now") LocalDateTime now);

    @Update("UPDATE app_message_event_inbox SET payload_ciphertext=NULL, payload_iv=NULL, "
            + "payload_key_version=NULL, payload_hmac=NULL, payload_cleared_at=#{now}, "
            + "status=CASE WHEN status IN ('pending','processing','failed') THEN 'dead' ELSE status END, "
            + "next_retry_time=NULL, update_time=#{now} WHERE payload_cleared_at IS NULL "
            + "AND payload_expires_at IS NOT NULL AND payload_expires_at<=#{now} AND deleted=0 "
            + "ORDER BY payload_expires_at,id LIMIT #{limit}")
    int clearExpiredPayloads(@Param("now") LocalDateTime now, @Param("limit") int limit);
}
