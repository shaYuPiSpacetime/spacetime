package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.mapper.AppMessageWhisperMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Collection;

/** 悄悄话事实数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageWhisperDaoImpl implements AppMessageWhisperDao {
    private final AppMessageWhisperMapper mapper;

    @Override
    public AppMessageWhisper selectByIdForUpdate(Long id) {
        return mapper.selectByIdForUpdate(id);
    }

    @Override
    public AppMessageWhisper selectByWhisperNo(String whisperNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getWhisperNo, whisperNo));
    }

    @Override
    public Page<AppMessageWhisper> selectPage(Page<AppMessageWhisper> page,
                                              LambdaQueryWrapper<AppMessageWhisper> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public AppMessageWhisper selectByWhisperNoForUpdate(String whisperNo) {
        return mapper.selectByWhisperNoForUpdate(whisperNo);
    }

    @Override
    public AppMessageWhisper selectBySenderRequestId(Long senderUserId, String requestId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getSenderUserId, senderUserId)
                .eq(AppMessageWhisper::getSendRequestId, requestId));
    }

    @Override
    public AppMessageWhisper selectByReceiverReplyRequestId(Long receiverUserId, String requestId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getReceiverUserId, receiverUserId)
                .eq(AppMessageWhisper::getReplyRequestId, requestId));
    }

    @Override
    public AppMessageWhisper selectActivePair(Long userLowId, Long userHighId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getUserLowId, userLowId)
                .eq(AppMessageWhisper::getUserHighId, userHighId)
                .eq(AppMessageWhisper::getStatus, MessageWhisperStatusEnum.PENDING.getCode())
                .eq(AppMessageWhisper::getActiveMarker, 1));
    }

    @Override
    public AppMessageWhisper selectLatestPair(Long userLowId, Long userHighId) {
        List<AppMessageWhisper> records = mapper.selectList(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getUserLowId, userLowId)
                .eq(AppMessageWhisper::getUserHighId, userHighId)
                .orderByDesc(AppMessageWhisper::getId)
                .last("LIMIT 1"));
        return records == null || records.isEmpty() ? null : records.get(0);
    }

    @Override
    public long countPaidVipFree(Long senderUserId, LocalDate benefitDate) {
        return mapper.selectCount(new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getSenderUserId, senderUserId)
                .eq(AppMessageWhisper::getBenefitDate, benefitDate)
                .eq(AppMessageWhisper::getPayType, "vip_free")
                .in(AppMessageWhisper::getPaymentStatus, "paid", "refunding"));
    }

    @Override
    public List<Long> selectRefundingIds(int limit) {
        return mapper.selectRefundingIds(Math.max(1, Math.min(limit, 500)));
    }

    @Override
    public List<AppMessageWhisper> selectPending(Long userId, String direction, Long cursorId,
                                                  int size, LocalDateTime now) {
        LambdaQueryWrapper<AppMessageWhisper> query = new LambdaQueryWrapper<AppMessageWhisper>()
                .eq("received".equals(direction), AppMessageWhisper::getReceiverUserId, userId)
                .eq("sent".equals(direction), AppMessageWhisper::getSenderUserId, userId)
                .eq(AppMessageWhisper::getStatus, MessageWhisperStatusEnum.PENDING.getCode())
                .eq(AppMessageWhisper::getDeliveryStatus, MessageDeliveryStatusEnum.SENT.getCode())
                .gt(AppMessageWhisper::getExpiresAt, now)
                .lt(cursorId != null, AppMessageWhisper::getId, cursorId)
                .orderByDesc(AppMessageWhisper::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 51)));
        return mapper.selectList(query);
    }

    @Override
    public long countUnreadPending(Long receiverUserId, LocalDateTime now) {
        return mapper.selectCount(readableQuery(receiverUserId, now)
                .isNull(AppMessageWhisper::getReceiverReadAt));
    }

    @Override
    public List<String> selectReadableNos(Long receiverUserId, Collection<String> whisperNos,
                                           LocalDateTime now) {
        if (whisperNos == null || whisperNos.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(readableQuery(receiverUserId, now)
                        .in(AppMessageWhisper::getWhisperNo, whisperNos))
                .stream().map(AppMessageWhisper::getWhisperNo).toList();
    }

    @Override
    public int markReadBatch(Long receiverUserId, Collection<String> whisperNos,
                             LocalDateTime readAt) {
        if (whisperNos == null || whisperNos.isEmpty()) {
            return 0;
        }
        return mapper.update(null, new LambdaUpdateWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getReceiverUserId, receiverUserId)
                .in(AppMessageWhisper::getWhisperNo, whisperNos)
                .eq(AppMessageWhisper::getStatus, MessageWhisperStatusEnum.PENDING.getCode())
                .eq(AppMessageWhisper::getDeliveryStatus, MessageDeliveryStatusEnum.SENT.getCode())
                .gt(AppMessageWhisper::getExpiresAt, readAt)
                .isNull(AppMessageWhisper::getReceiverReadAt)
                .set(AppMessageWhisper::getReceiverReadAt, readAt)
                .set(AppMessageWhisper::getUpdateTime, readAt));
    }

    private LambdaQueryWrapper<AppMessageWhisper> readableQuery(Long receiverUserId,
                                                                 LocalDateTime now) {
        return new LambdaQueryWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getReceiverUserId, receiverUserId)
                .eq(AppMessageWhisper::getStatus, MessageWhisperStatusEnum.PENDING.getCode())
                .eq(AppMessageWhisper::getDeliveryStatus, MessageDeliveryStatusEnum.SENT.getCode())
                .gt(AppMessageWhisper::getExpiresAt, now);
    }

    @Override
    public void insert(AppMessageWhisper entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppMessageWhisper entity) {
        mapper.updateById(entity);
    }

    @Override
    public int reserveReply(Long id, int expectedVersion, String requestId, Long replyMessageId,
                            LocalDateTime reservedAt) {
        return mapper.reserveReply(id, expectedVersion, requestId, replyMessageId, reservedAt);
    }

    @Override
    public int releaseReplyReservation(Long id, String requestId, Long replyMessageId,
                                       LocalDateTime releasedAt) {
        return mapper.releaseReplyReservation(id, requestId, replyMessageId, releasedAt);
    }

    @Override
    public int transitionToReplied(AppMessageWhisper entity, int expectedVersion) {
        return mapper.update(null, new LambdaUpdateWrapper<AppMessageWhisper>()
                .eq(AppMessageWhisper::getId, entity.getId())
                .eq(AppMessageWhisper::getStatus, MessageWhisperStatusEnum.PENDING.getCode())
                .eq(AppMessageWhisper::getDeliveryStatus, MessageDeliveryStatusEnum.SENT.getCode())
                .eq(AppMessageWhisper::getActiveMarker, 1)
                .eq(AppMessageWhisper::getReplyRequestId, entity.getReplyRequestId())
                .eq(AppMessageWhisper::getVersion, expectedVersion)
                .set(AppMessageWhisper::getStatus, entity.getStatus())
                .set(AppMessageWhisper::getActiveMarker, null)
                .set(AppMessageWhisper::getRepliedAt, entity.getRepliedAt())
                .set(AppMessageWhisper::getMatchId, entity.getMatchId())
                .set(AppMessageWhisper::getMatchNo, entity.getMatchNo())
                .set(AppMessageWhisper::getConversationId, entity.getConversationId())
                .set(AppMessageWhisper::getConversationNo, entity.getConversationNo())
                .set(AppMessageWhisper::getRequestMessageId, entity.getRequestMessageId())
                .set(AppMessageWhisper::getReplyMessageId, entity.getReplyMessageId())
                .set(AppMessageWhisper::getVersion, expectedVersion + 1)
                .set(AppMessageWhisper::getUpdateTime, entity.getRepliedAt()));
    }

    @Override
    public int confirmRequestDelivery(Long requestMessageId, LocalDateTime deliveredAt) {
        return mapper.confirmRequestDelivery(requestMessageId, deliveredAt);
    }

    @Override
    public int failRequestDelivery(Long requestMessageId, String reason, LocalDateTime failedAt) {
        return mapper.failRequestDelivery(requestMessageId, reason, failedAt);
    }

    @Override
    public int markRefunded(Long id, int expectedVersion, String refundFlowNo,
                            LocalDateTime refundedAt) {
        return mapper.markRefunded(id, expectedVersion, refundFlowNo, refundedAt);
    }

    @Override
    public List<AppMessageWhisper> selectRefundedWithoutMessage(
            LocalDateTime updatedAfter, int limit) {
        return mapper.selectRefundedWithoutMessage(updatedAfter, limit);
    }

    @Override
    public int invalidateByUser(Long userId, String reason, LocalDateTime invalidTime) {
        return mapper.invalidateByUser(userId, reason, invalidTime);
    }

    @Override
    public int invalidateByPair(Long userLowId, Long userHighId, String reason,
                                LocalDateTime invalidTime) {
        return mapper.invalidateByPair(userLowId, userHighId, reason, invalidTime);
    }

    @Override
    public int expireDue(LocalDateTime now) {
        return mapper.expireDue(now);
    }
}
