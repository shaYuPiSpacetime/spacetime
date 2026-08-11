package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageWhisper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/** 悄悄话状态事实 Mapper。 */
@Mapper
public interface AppMessageWhisperMapper extends BaseMapper<AppMessageWhisper> {
    @Select("SELECT * FROM app_message_whisper WHERE id=#{id} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageWhisper selectByIdForUpdate(@Param("id") Long id);

    @Select("SELECT * FROM app_message_whisper WHERE whisper_no=#{whisperNo} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageWhisper selectByWhisperNoForUpdate(@Param("whisperNo") String whisperNo);

    @Select("SELECT id FROM app_message_whisper WHERE payment_status='refunding' AND deleted=0 "
            + "ORDER BY update_time,id LIMIT #{limit}")
    java.util.List<Long> selectRefundingIds(@Param("limit") int limit);

    @Update("UPDATE app_message_whisper SET status='expired', active_marker=NULL, invalid_time=#{now}, "
            + "isolated_at=#{now}, purge_after=COALESCE(purge_after, DATE_ADD(#{now}, INTERVAL "
            + "COALESCE((SELECT r.ordinary_message_retain_days FROM app_message_rule_version r "
            + "WHERE r.version_no=app_message_whisper.config_version AND r.deleted=0 LIMIT 1),180) DAY)), "
            + "version=version+1, update_time=#{now} WHERE status='pending' AND delivery_status='sent' "
            + "AND reply_request_id IS NULL AND expires_at<=#{now} AND deleted=0 "
            + "ORDER BY expires_at,id LIMIT 200")
    int expireDue(@Param("now") LocalDateTime now);

    @Update("UPDATE app_message_whisper SET reply_request_id=#{requestId}, "
            + "reply_message_id=#{replyMessageId}, version=version+1, update_time=#{reservedAt} "
            + "WHERE id=#{id} AND status='pending' AND delivery_status='sent' AND active_marker=1 "
            + "AND reply_request_id IS NULL AND expires_at>#{reservedAt} AND version=#{expectedVersion} "
            + "AND deleted=0")
    int reserveReply(@Param("id") Long id,
                     @Param("expectedVersion") int expectedVersion,
                     @Param("requestId") String requestId,
                     @Param("replyMessageId") Long replyMessageId,
                     @Param("reservedAt") LocalDateTime reservedAt);

    @Update("UPDATE app_message_whisper SET delivery_status='sent', delivered_at=#{deliveredAt}, "
            + "update_time=#{deliveredAt} WHERE request_message_id=#{requestMessageId} "
            + "AND delivery_status='queued' AND status='pending' AND deleted=0")
    int confirmRequestDelivery(@Param("requestMessageId") Long requestMessageId,
                               @Param("deliveredAt") LocalDateTime deliveredAt);

    @Update("UPDATE app_message_whisper w "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=w.config_version AND r.deleted=0 "
            + "SET w.delivery_status='failed', w.status='invalid', w.active_marker=NULL, "
            + "w.payment_status=CASE WHEN w.payment_status='paid' THEN 'refunding' ELSE w.payment_status END, "
            + "w.invalid_reason=#{reason}, w.invalid_time=#{failedAt}, w.isolated_at=#{failedAt}, "
            + "w.purge_after=COALESCE(w.purge_after, DATE_ADD(#{failedAt}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "w.version=w.version+1, w.update_time=#{failedAt} "
            + "WHERE w.request_message_id=#{requestMessageId} AND w.delivery_status='queued' "
            + "AND w.status='pending' AND w.deleted=0")
    int failRequestDelivery(@Param("requestMessageId") Long requestMessageId,
                            @Param("reason") String reason,
                            @Param("failedAt") LocalDateTime failedAt);

    @Update("UPDATE app_message_whisper SET payment_status='refunded', "
            + "asset_refund_flow_no=#{refundFlowNo}, version=version+1, update_time=#{refundedAt} "
            + "WHERE id=#{id} AND payment_status='refunding' AND version=#{expectedVersion} AND deleted=0")
    int markRefunded(@Param("id") Long id,
                     @Param("expectedVersion") int expectedVersion,
                     @Param("refundFlowNo") String refundFlowNo,
                     @Param("refundedAt") LocalDateTime refundedAt);

    @Select("SELECT w.* FROM app_message_whisper w "
            + "LEFT JOIN app_message_event_inbox i ON i.event_key=CONCAT("
            + "'prd04:system_message_create:whisper:',w.whisper_no,':refunded:',w.sender_user_id) "
            + "AND i.deleted=0 WHERE w.deleted=0 AND w.payment_status='refunded' "
            + "AND w.update_time>=#{updatedAfter} AND i.id IS NULL "
            + "ORDER BY w.update_time,w.id LIMIT #{limit}")
    java.util.List<AppMessageWhisper> selectRefundedWithoutMessage(
            @Param("updatedAfter") LocalDateTime updatedAfter, @Param("limit") int limit);

    @Update("UPDATE app_message_whisper SET reply_request_id=NULL, reply_message_id=NULL, "
            + "version=version+1, update_time=#{releasedAt} WHERE id=#{id} AND status='pending' "
            + "AND reply_request_id=#{requestId} AND reply_message_id=#{replyMessageId} AND deleted=0")
    int releaseReplyReservation(@Param("id") Long id,
                                @Param("requestId") String requestId,
                                @Param("replyMessageId") Long replyMessageId,
                                @Param("releasedAt") LocalDateTime releasedAt);

    @Update("UPDATE app_message_whisper w "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=w.config_version AND r.deleted=0 "
            + "SET w.status='invalid', w.active_marker=NULL, w.invalid_reason=#{reason}, "
            + "w.invalid_time=#{invalidTime}, w.isolated_at=#{invalidTime}, "
            + "w.purge_after=COALESCE(w.purge_after, DATE_ADD(#{invalidTime}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "w.version=w.version+1, w.update_time=#{invalidTime} WHERE w.status='pending' "
            + "AND w.active_marker=1 AND (w.sender_user_id=#{userId} OR w.receiver_user_id=#{userId}) "
            + "AND w.deleted=0")
    int invalidateByUser(@Param("userId") Long userId,
                         @Param("reason") String reason,
                         @Param("invalidTime") LocalDateTime invalidTime);

    @Update("UPDATE app_message_whisper w "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=w.config_version AND r.deleted=0 "
            + "SET w.status='invalid', w.active_marker=NULL, w.invalid_reason=#{reason}, "
            + "w.invalid_time=#{invalidTime}, w.isolated_at=#{invalidTime}, "
            + "w.purge_after=COALESCE(w.purge_after, DATE_ADD(#{invalidTime}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "w.version=w.version+1, w.update_time=#{invalidTime} WHERE w.status='pending' "
            + "AND w.active_marker=1 AND w.user_low_id=#{userLowId} AND w.user_high_id=#{userHighId} "
            + "AND w.deleted=0")
    int invalidateByPair(@Param("userLowId") Long userLowId,
                         @Param("userHighId") Long userHighId,
                         @Param("reason") String reason,
                         @Param("invalidTime") LocalDateTime invalidTime);
}
