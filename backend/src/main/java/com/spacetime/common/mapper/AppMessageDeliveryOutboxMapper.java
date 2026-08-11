package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

/** 消息渠道 Outbox 原子认领与状态 Mapper。 */
@Mapper
public interface AppMessageDeliveryOutboxMapper extends BaseMapper<AppMessageDeliveryOutbox> {
    @Select("SELECT * FROM app_message_delivery_outbox WHERE deleted=0 AND "
            + "(status='pending' OR (status='failed' AND next_retry_time<=#{now}) "
            + "OR (status='processing' AND processing_started_at<=#{staleBefore})) "
            + "ORDER BY create_time,id LIMIT #{limit}")
    List<AppMessageDeliveryOutbox> selectClaimable(@Param("now") LocalDateTime now,
                                                    @Param("staleBefore") LocalDateTime staleBefore,
                                                    @Param("limit") int limit);

    @Select("SELECT o.* FROM app_message_delivery_outbox o "
            + "LEFT JOIN app_message_record r ON r.id=o.aggregate_id "
            + "AND o.aggregate_type='message' AND r.deleted=0 "
            + "WHERE o.deleted=0 AND o.update_time<=#{staleBefore} AND ("
            + "(o.status='sent' AND (r.id IS NULL OR r.send_status<>'sent' "
            + "OR r.tim_msg_key IS NULL OR o.provider_msg_key IS NULL "
            + "OR r.tim_msg_key<>o.provider_msg_key)) "
            + "OR (o.status='dead' AND r.send_status='sent')) "
            + "ORDER BY o.update_time,o.id LIMIT #{limit}")
    List<AppMessageDeliveryOutbox> selectMappingInconsistencies(
            @Param("staleBefore") LocalDateTime staleBefore,
            @Param("limit") int limit);

    @Update("UPDATE app_message_delivery_outbox SET status='processing', "
            + "processing_started_at=#{now}, update_time=#{now} WHERE id=#{id} AND deleted=0 AND "
            + "(status='pending' OR (status='failed' AND next_retry_time<=#{now}) "
            + "OR (status='processing' AND processing_started_at<=#{staleBefore}))")
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now,
              @Param("staleBefore") LocalDateTime staleBefore);

    @Update("UPDATE app_message_delivery_outbox SET status='sent', provider_msg_key=#{providerMsgKey}, "
            + "sent_at=#{sentAt}, next_retry_time=NULL, last_error_code=NULL, last_error_summary=NULL, "
            + "update_time=#{sentAt} WHERE id=#{id} AND status='processing' AND deleted=0")
    int markSent(@Param("id") Long id, @Param("providerMsgKey") String providerMsgKey,
                 @Param("sentAt") LocalDateTime sentAt);

    @Update("UPDATE app_message_delivery_outbox SET "
            + "provider_msg_key=COALESCE(provider_msg_key,#{providerMsgKey}), "
            + "callback_confirmed_at=COALESCE(callback_confirmed_at,#{confirmedAt}), "
            + "update_time=#{confirmedAt} WHERE id=#{id} AND deleted=0 "
            + "AND (provider_msg_key IS NULL OR provider_msg_key=#{providerMsgKey})")
    int confirmCallback(@Param("id") Long id,
                        @Param("providerMsgKey") String providerMsgKey,
                        @Param("confirmedAt") LocalDateTime confirmedAt);

    @Update("UPDATE app_message_delivery_outbox SET status=#{status}, retry_count=#{retryCount}, "
            + "next_retry_time=#{nextRetryTime}, last_error_code=#{errorCode}, "
            + "last_error_summary=#{errorSummary}, update_time=#{now} "
            + "WHERE id=#{id} AND status='processing' AND deleted=0")
    int markFailure(@Param("id") Long id,
                    @Param("retryCount") int retryCount,
                    @Param("status") String status,
                    @Param("nextRetryTime") LocalDateTime nextRetryTime,
                    @Param("errorCode") String errorCode,
                    @Param("errorSummary") String errorSummary,
                    @Param("now") LocalDateTime now);
}
