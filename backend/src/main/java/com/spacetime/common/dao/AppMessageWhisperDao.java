package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppMessageWhisper;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Collection;

/** 悄悄话事实数据访问接口。 */
public interface AppMessageWhisperDao {
    AppMessageWhisper selectByIdForUpdate(Long id);
    AppMessageWhisper selectByWhisperNo(String whisperNo);
    AppMessageWhisper selectByWhisperNoForUpdate(String whisperNo);
    AppMessageWhisper selectBySenderRequestId(Long senderUserId, String requestId);
    AppMessageWhisper selectByReceiverReplyRequestId(Long receiverUserId, String requestId);
    AppMessageWhisper selectActivePair(Long userLowId, Long userHighId);
    AppMessageWhisper selectLatestPair(Long userLowId, Long userHighId);
    long countPaidVipFree(Long senderUserId, LocalDate benefitDate);
    List<Long> selectRefundingIds(int limit);
    List<AppMessageWhisper> selectRefundedWithoutMessage(LocalDateTime updatedAfter, int limit);
    List<AppMessageWhisper> selectPending(Long userId, String direction, Long cursorId,
                                          int size, LocalDateTime now);
    List<AppMessageWhisper> selectVisible(Long userId, String direction, String bucket,
                                          Long cursorId, int size, LocalDateTime now);
    long countVisible(Long userId, String direction, String bucket, LocalDateTime now);
    long countPending(Long receiverUserId, LocalDateTime now);
    long countUnreadPending(Long receiverUserId, LocalDateTime now);
    List<String> selectReadableNos(Long receiverUserId, Collection<String> whisperNos,
                                   LocalDateTime now);
    int markReadBatch(Long receiverUserId, Collection<String> whisperNos, LocalDateTime readAt);
    int hideByReceiver(Long receiverUserId, String whisperNo, String hideType,
                       LocalDateTime hiddenAt);
    int hideBucketByReceiver(Long receiverUserId, String bucket, String hideType,
                             LocalDateTime now);
    Page<AppMessageWhisper> selectPage(Page<AppMessageWhisper> page,
                                       LambdaQueryWrapper<AppMessageWhisper> wrapper);
    void insert(AppMessageWhisper entity);
    void updateById(AppMessageWhisper entity);
    int reserveReply(Long id, int expectedVersion, String requestId, Long replyMessageId,
                     LocalDateTime reservedAt);
    int releaseReplyReservation(Long id, String requestId, Long replyMessageId,
                                LocalDateTime releasedAt);
    int transitionToReplied(AppMessageWhisper entity, int expectedVersion);
    int confirmRequestDelivery(Long requestMessageId, LocalDateTime deliveredAt);
    int failRequestDelivery(Long requestMessageId, String reason, LocalDateTime failedAt);
    int markRefunded(Long id, int expectedVersion, String refundFlowNo, LocalDateTime refundedAt);
    int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime);
    int invalidateByPair(Long userLowId, Long userHighId, String reason, LocalDateTime invalidTime);
    int expireDue(LocalDateTime now);
}
