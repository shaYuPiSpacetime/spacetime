package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageReliableStatusEnum;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageReadStatusEnum;
import com.spacetime.common.enums.MessageTypeEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.WhisperReplyResult;
import com.spacetime.common.service.MessageDeliveryOutboxService;
import com.spacetime.common.service.MessageDomainService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationDomainService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 悄悄话回复编排器。
 *
 * <p>回复预占、TIM 投递和匹配最终确认故意拆成两个本地事务。这样 TIM 未确认成功时不会提前
 * 创建匹配或私信会话；TIM 已成功而最终确认短暂失败时，又可以沿用同一个 requestId/MsgKey
 * 继续确认而不重复发送。</p>
 */
@Service
@RequiredArgsConstructor
public class MessageDomainServiceImpl implements MessageDomainService {
    private static final String FALLBACK_CONFIG_VERSION = "MSG-CFG-INIT-001";
    private static final int MESSAGE_PARAM_ERROR = 4001;
    private static final int MESSAGE_NOT_FOUND = 404;
    private static final int MESSAGE_FORBIDDEN = 403;
    private static final int ACCESS_RESTRICTED = 30001;
    private static final int RELATION_FORBIDDEN = 30002;
    private static final int WHISPER_ENDED = 30011;
    private static final int WHISPER_CONFLICT = 30014;
    private static final int IDEMPOTENCY_CONFLICT = 30020;
    private static final int MESSAGE_INTERNAL_ERROR = 5001;

    private final AppMessageWhisperDao whisperDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageConversationMemberDao memberDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageDeliveryOutboxDao outboxDao;
    private final RelationDomainService relationDomainService;
    private final AppUserDao appUserDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final MessageDeliveryOutboxService deliveryOutboxService;
    private final TransactionOperations transactionOperations;
    private final ObjectMapper objectMapper;

    @Override
    public WhisperReplyResult replyWhisper(Long receiverUserId, String whisperNo, String requestId,
                                            String replyContent, LocalDateTime repliedAt) {
        String normalizedContent = normalizeReplyInput(receiverUserId, whisperNo, requestId, replyContent);
        LocalDateTime eventTime = repliedAt == null ? LocalDateTime.now() : repliedAt;

        ReplyPreparation preparation = requirePreparation(transactionOperations.execute(status ->
                prepareReply(receiverUserId, whisperNo, requestId, normalizedContent, eventTime)));
        if (preparation.completedResult() != null) {
            return preparation.completedResult();
        }

        try {
            deliveryOutboxService.process(preparation.outboxId(), eventTime);
        } catch (RuntimeException ex) {
            releaseReservationWhenDeliveryIsDead(preparation, eventTime);
            throw ex;
        }

        return requireReplyResult(transactionOperations.execute(status ->
                finalizeReply(receiverUserId, whisperNo, requestId, preparation.replyMessageId(), eventTime)));
    }

    private ReplyPreparation prepareReply(Long receiverUserId, String whisperNo, String requestId,
                                           String content, LocalDateTime eventTime) {
        AppMessageWhisper duplicate = whisperDao.selectByReceiverReplyRequestId(receiverUserId, requestId);
        if (duplicate != null) {
            return existingPreparation(duplicate, whisperNo, content);
        }

        AppMessageWhisper whisper = whisperDao.selectByWhisperNoForUpdate(whisperNo);
        requireReplyableWhisper(whisper, receiverUserId, eventTime);
        if (whisper.getReplyRequestId() != null) {
            if (Objects.equals(requestId, whisper.getReplyRequestId())) {
                return existingPreparation(whisper, whisperNo, content);
            }
            throw new BusinessException(WHISPER_CONFLICT, "该悄悄话正在处理，请刷新后重试");
        }
        requireMatchablePair(whisper.getSenderUserId(), whisper.getReceiverUserId());

        AppMessageRecord requestMessage = requireDeliveredRequestMessage(whisper);
        AppMessageRecord replyMessage = new AppMessageRecord();
        replyMessage.setMessageNo(businessNo("MSG"));
        replyMessage.setClientMsgId(requestId);
        replyMessage.setSenderType("user");
        replyMessage.setSenderUserId(receiverUserId);
        replyMessage.setReceiverUserId(whisper.getSenderUserId());
        replyMessage.setMessageType(MessageTypeEnum.WHISPER_REPLY.getCode());
        replyMessage.setContentText(content);
        replyMessage.setSendStatus(MessageSendStatusEnum.QUEUED.getCode());
        replyMessage.setReceiverReadStatus(MessageReadStatusEnum.NOT_APPLICABLE.getCode());
        replyMessage.setReplyToMessageId(requestMessage.getId());
        replyMessage.setSourceBizType("whisper_reply");
        replyMessage.setSourceBizNo(whisperNo);
        replyMessage.setVersion(0);
        try {
            recordDao.insert(replyMessage);
        } catch (DuplicateKeyException ex) {
            AppMessageRecord concurrent = recordDao.selectBySenderClientMsgId(receiverUserId, requestId);
            if (concurrent == null) {
                throw new BusinessException(IDEMPOTENCY_CONFLICT, "回复幂等键已被其他请求使用");
            }
            requireSameReplyMessage(concurrent, whisperNo, content);
            replyMessage = concurrent;
        }

        AppMessageDeliveryOutbox outbox = ensureReplyOutbox(whisper, replyMessage, requestId);
        int expectedVersion = valueOrZero(whisper.getVersion());
        if (whisperDao.reserveReply(whisper.getId(), expectedVersion, requestId,
                replyMessage.getId(), eventTime) != 1) {
            throw new BusinessException(WHISPER_CONFLICT, "悄悄话状态已变化，请刷新后重试");
        }
        whisper.setReplyRequestId(requestId);
        whisper.setReplyMessageId(replyMessage.getId());
        whisper.setVersion(expectedVersion + 1);
        return new ReplyPreparation(whisper.getId(), whisperNo, requestId,
                replyMessage.getId(), outbox.getId(), null);
    }

    private WhisperReplyResult finalizeReply(Long receiverUserId, String whisperNo, String requestId,
                                              Long replyMessageId, LocalDateTime eventTime) {
        AppMessageWhisper whisper = whisperDao.selectByWhisperNoForUpdate(whisperNo);
        if (whisper == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话不存在");
        }
        if (!Objects.equals(receiverUserId, whisper.getReceiverUserId())) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "只有悄悄话接收方可以回复");
        }
        if (MessageWhisperStatusEnum.REPLIED.getCode().equals(whisper.getStatus())) {
            if (!Objects.equals(requestId, whisper.getReplyRequestId())) {
                throw new BusinessException(WHISPER_CONFLICT, "该悄悄话已经处理，请进入私信会话");
            }
            return existingReply(whisper, null);
        }
        if (!MessageWhisperStatusEnum.PENDING.getCode().equals(whisper.getStatus())
                || !Objects.equals(requestId, whisper.getReplyRequestId())
                || !Objects.equals(replyMessageId, whisper.getReplyMessageId())) {
            throw new BusinessException(WHISPER_CONFLICT, "悄悄话状态已变化，请刷新后重试");
        }

        AppMessageRecord replyMessage = recordDao.selectById(replyMessageId);
        if (replyMessage == null
                || !MessageSendStatusEnum.SENT.getCode().equals(replyMessage.getSendStatus())
                || isBlank(replyMessage.getTimMessageId()) || isBlank(replyMessage.getTimMsgKey())) {
            throw new BusinessException(MESSAGE_INTERNAL_ERROR, "回复尚未完成TIM投递");
        }
        AppMessageRecord requestMessage = requireDeliveredRequestMessage(whisper);

        AppRelationMatch match = relationDomainService.addMatchSource(
                whisper.getSenderUserId(), whisper.getReceiverUserId(),
                RelationMatchSourceTypeEnum.WHISPER_REPLY.getCode(), whisperNo, eventTime);
        AppMessageConversation conversation = ensureConversation(match, whisper, eventTime);
        ensureMember(conversation, whisper.getSenderUserId(), whisper.getReceiverUserId());
        ensureMember(conversation, whisper.getReceiverUserId(), whisper.getSenderUserId());
        bindOpeningMessage(requestMessage, conversation, eventTime);
        bindOpeningMessage(replyMessage, conversation, eventTime);

        conversation.setLastMessageId(replyMessage.getId());
        conversation.setLastMessageTime(replyMessage.getSentAt() == null ? eventTime : replyMessage.getSentAt());
        conversation.setVersion(valueOrZero(conversation.getVersion()) + 1);
        conversationDao.updateById(conversation);

        int expectedVersion = valueOrZero(whisper.getVersion());
        whisper.setStatus(MessageWhisperStatusEnum.REPLIED.getCode());
        whisper.setActiveMarker(null);
        whisper.setRepliedAt(eventTime);
        whisper.setMatchId(match.getId());
        whisper.setMatchNo(match.getMatchNo());
        whisper.setConversationId(conversation.getId());
        whisper.setConversationNo(conversation.getConversationNo());
        whisper.setRequestMessageId(requestMessage.getId());
        whisper.setReplyMessageId(replyMessage.getId());
        whisper.setVersion(expectedVersion + 1);
        if (whisperDao.transitionToReplied(whisper, expectedVersion) != 1) {
            throw new BusinessException(WHISPER_CONFLICT, "悄悄话状态已变化，请刷新后重试");
        }
        return result(whisper, replyMessage);
    }

    private ReplyPreparation existingPreparation(AppMessageWhisper whisper, String whisperNo,
                                                  String content) {
        if (!Objects.equals(whisperNo, whisper.getWhisperNo())) {
            throw new BusinessException(IDEMPOTENCY_CONFLICT, "回复幂等键与首次悄悄话不一致");
        }
        AppMessageRecord reply = whisper.getReplyMessageId() == null
                ? null : recordDao.selectById(whisper.getReplyMessageId());
        if (reply == null) {
            throw new BusinessException(MESSAGE_INTERNAL_ERROR, "回复幂等记录不完整");
        }
        requireSameReplyMessage(reply, whisperNo, content);
        if (MessageWhisperStatusEnum.REPLIED.getCode().equals(whisper.getStatus())) {
            return new ReplyPreparation(whisper.getId(), whisperNo, whisper.getReplyRequestId(),
                    reply.getId(), null, existingReply(whisper, reply));
        }
        if (!MessageWhisperStatusEnum.PENDING.getCode().equals(whisper.getStatus())) {
            throw new BusinessException(WHISPER_ENDED, "该悄悄话申请已结束");
        }
        AppMessageDeliveryOutbox outbox = outboxDao.selectByEventAndChannel(
                outboxEventKey(reply.getMessageNo()), "tencent_im");
        if (outbox == null) {
            throw new BusinessException(MESSAGE_INTERNAL_ERROR, "回复投递任务不存在");
        }
        return new ReplyPreparation(whisper.getId(), whisperNo, whisper.getReplyRequestId(),
                reply.getId(), outbox.getId(), null);
    }

    private AppMessageDeliveryOutbox ensureReplyOutbox(AppMessageWhisper whisper,
                                                        AppMessageRecord replyMessage,
                                                        String requestId) {
        String eventKey = outboxEventKey(replyMessage.getMessageNo());
        AppMessageDeliveryOutbox existing = outboxDao.selectByEventAndChannel(eventKey, "tencent_im");
        if (existing != null) {
            return existing;
        }
        AppMessageDeliveryOutbox outbox = new AppMessageDeliveryOutbox();
        outbox.setOutboxNo(businessNo("OBX"));
        outbox.setEventKey(eventKey);
        outbox.setAggregateType("message");
        outbox.setAggregateId(replyMessage.getId());
        outbox.setAggregateNo(replyMessage.getMessageNo());
        outbox.setSenderUserId(whisper.getReceiverUserId());
        outbox.setReceiverUserId(whisper.getSenderUserId());
        outbox.setChannel("tencent_im");
        outbox.setEventType("whisper_reply");
        outbox.setPayloadJson(writeMetadata(Map.of(
                "whisperNo", whisper.getWhisperNo(),
                "messageType", "whisper_reply",
                "requestId", requestId,
                "sendMsgControl", List.of("NoMsgCheck"))));
        outbox.setProtocolVersion(1);
        outbox.setStatus(MessageReliableStatusEnum.PENDING.getCode());
        outbox.setRetryCount(0);
        try {
            outboxDao.insert(outbox);
            return outbox;
        } catch (DuplicateKeyException ex) {
            AppMessageDeliveryOutbox concurrent = outboxDao.selectByEventAndChannel(eventKey, "tencent_im");
            if (concurrent == null) {
                throw ex;
            }
            return concurrent;
        }
    }

    private void releaseReservationWhenDeliveryIsDead(ReplyPreparation preparation,
                                                        LocalDateTime eventTime) {
        AppMessageDeliveryOutbox outbox = outboxDao.selectById(preparation.outboxId());
        if (outbox == null || !MessageReliableStatusEnum.DEAD.getCode().equals(outbox.getStatus())) {
            return;
        }
        transactionOperations.executeWithoutResult(status -> whisperDao.releaseReplyReservation(
                preparation.whisperId(), preparation.requestId(), preparation.replyMessageId(), eventTime));
    }

    private void requireReplyableWhisper(AppMessageWhisper whisper, Long receiverUserId,
                                          LocalDateTime eventTime) {
        if (whisper == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话不存在");
        }
        if (!Objects.equals(receiverUserId, whisper.getReceiverUserId())) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "只有悄悄话接收方可以回复");
        }
        if (!MessageWhisperStatusEnum.PENDING.getCode().equals(whisper.getStatus())) {
            String message = MessageWhisperStatusEnum.REPLIED.getCode().equals(whisper.getStatus())
                    ? "该悄悄话已经处理，请进入私信会话" : "该悄悄话申请已结束";
            throw new BusinessException(MessageWhisperStatusEnum.REPLIED.getCode().equals(whisper.getStatus())
                    ? WHISPER_CONFLICT : WHISPER_ENDED, message);
        }
        if (!MessageDeliveryStatusEnum.SENT.getCode().equals(whisper.getDeliveryStatus())
                || whisper.getExpiresAt() == null || !eventTime.isBefore(whisper.getExpiresAt())) {
            throw new BusinessException(WHISPER_ENDED, "该悄悄话申请已结束");
        }
    }

    private AppMessageRecord requireDeliveredRequestMessage(AppMessageWhisper whisper) {
        AppMessageRecord request = whisper.getRequestMessageId() == null
                ? null : recordDao.selectById(whisper.getRequestMessageId());
        if (request == null || !MessageTypeEnum.WHISPER.getCode().equals(request.getMessageType())
                || !MessageSendStatusEnum.SENT.getCode().equals(request.getSendStatus())
                || isBlank(request.getTimMessageId()) || isBlank(request.getTimMsgKey())) {
            throw new BusinessException(WHISPER_ENDED, "原悄悄话尚未有效送达");
        }
        return request;
    }

    private void requireSameReplyMessage(AppMessageRecord message, String whisperNo, String content) {
        if (!Objects.equals(whisperNo, message.getSourceBizNo())
                || !MessageTypeEnum.WHISPER_REPLY.getCode().equals(message.getMessageType())
                || !Objects.equals(content, message.getContentText())) {
            throw new BusinessException(IDEMPOTENCY_CONFLICT, "回复幂等键与首次请求参数不一致");
        }
    }

    private AppMessageConversation ensureConversation(AppRelationMatch match, AppMessageWhisper whisper,
                                                       LocalDateTime eventTime) {
        AppMessageConversation conversation = conversationDao.selectByMatchIdForUpdate(match.getId());
        if (conversation != null) {
            return conversation;
        }
        conversation = conversationDao.selectActivePairForUpdate(whisper.getUserLowId(), whisper.getUserHighId());
        if (conversation != null) {
            if (!Objects.equals(conversation.getMatchId(), match.getId())) {
                throw new BusinessException(WHISPER_CONFLICT, "当前用户对已存在其他有效私信会话");
            }
            return conversation;
        }

        AppMessageConversation created = new AppMessageConversation();
        created.setConversationNo(businessNo("CV"));
        created.setTimConversationId("C2C_PAIR_" + whisper.getUserLowId() + "_" + whisper.getUserHighId());
        created.setMatchId(match.getId());
        created.setMatchNo(match.getMatchNo());
        created.setUserLowId(whisper.getUserLowId());
        created.setUserHighId(whisper.getUserHighId());
        created.setStatus(MessageConversationStatusEnum.ACTIVE.getCode());
        created.setActiveMarker(1);
        created.setConfigVersion(whisper.getConfigVersion() == null
                || whisper.getConfigVersion().isBlank()
                ? FALLBACK_CONFIG_VERSION : whisper.getConfigVersion());
        created.setProtectionEnabled(0);
        created.setLastMessageTime(eventTime);
        created.setVersion(0);
        try {
            conversationDao.insert(created);
            return created;
        } catch (DuplicateKeyException ex) {
            AppMessageConversation concurrent = conversationDao.selectByMatchIdForUpdate(match.getId());
            if (concurrent == null) {
                concurrent = conversationDao.selectActivePairForUpdate(
                        whisper.getUserLowId(), whisper.getUserHighId());
            }
            if (concurrent == null || !Objects.equals(concurrent.getMatchId(), match.getId())) {
                throw ex;
            }
            return concurrent;
        }
    }

    private void ensureMember(AppMessageConversation conversation, Long userId, Long peerUserId) {
        if (memberDao.selectByConversationAndUser(conversation.getId(), userId) != null) {
            return;
        }
        AppMessageConversationMember member = new AppMessageConversationMember();
        member.setConversationId(conversation.getId());
        member.setConversationNo(conversation.getConversationNo());
        member.setUserId(userId);
        member.setPeerUserId(peerUserId);
        member.setVersion(0);
        try {
            memberDao.insert(member);
        } catch (DuplicateKeyException ex) {
            if (memberDao.selectByConversationAndUser(conversation.getId(), userId) == null) {
                throw ex;
            }
        }
    }

    private void bindOpeningMessage(AppMessageRecord message, AppMessageConversation conversation,
                                    LocalDateTime eventTime) {
        if (Objects.equals(message.getConversationId(), conversation.getId())
                && Objects.equals(message.getConversationNo(), conversation.getConversationNo())) {
            return;
        }
        if (recordDao.bindConversation(message.getId(), conversation.getId(),
                conversation.getConversationNo(), eventTime) != 1) {
            throw new BusinessException(MESSAGE_INTERNAL_ERROR, "开场消息绑定私信会话失败");
        }
        message.setConversationId(conversation.getId());
        message.setConversationNo(conversation.getConversationNo());
    }

    private WhisperReplyResult existingReply(AppMessageWhisper whisper, AppMessageRecord knownReply) {
        AppMessageRecord reply = knownReply != null ? knownReply
                : whisper.getReplyMessageId() == null ? null : recordDao.selectById(whisper.getReplyMessageId());
        if (reply == null) {
            throw new BusinessException(MESSAGE_INTERNAL_ERROR, "回复消息记录不存在");
        }
        return result(whisper, reply);
    }

    private WhisperReplyResult result(AppMessageWhisper whisper, AppMessageRecord reply) {
        return new WhisperReplyResult(
                whisper.getWhisperNo(), whisper.getStatus(), whisper.getMatchNo(),
                whisper.getConversationNo(), reply.getMessageNo(), reply.getTimMessageId(),
                reply.getTimMsgKey(), whisper.getRepliedAt());
    }

    private void requireMatchablePair(Long senderUserId, Long receiverUserId) {
        AppUser sender = appUserDao.selectById(senderUserId);
        AppUser receiver = appUserDao.selectById(receiverUserId);
        if (sender == null || receiver == null
                || !"OPEN".equals(accessProjectionService.project(sender))
                || !"OPEN".equals(accessProjectionService.project(receiver))) {
            throw new BusinessException(ACCESS_RESTRICTED, "双方当前不可建立匹配");
        }
        String blacklist = RelationBlockTypeEnum.BLACKLIST.getCode();
        if (relationBlockDao.selectActive(senderUserId, receiverUserId, blacklist) != null
                || relationBlockDao.selectActive(receiverUserId, senderUserId, blacklist) != null) {
            throw new BusinessException(RELATION_FORBIDDEN, "双方当前不可建立匹配");
        }
    }

    private String normalizeReplyInput(Long receiverUserId, String whisperNo, String requestId,
                                       String replyContent) {
        if (receiverUserId == null || isBlank(whisperNo) || isBlank(requestId)) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "回复悄悄话参数不完整");
        }
        if (requestId.length() < 8 || requestId.length() > 64) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "回复幂等请求编号长度应为8到64个字符");
        }
        String normalized = replyContent == null ? "" : replyContent.trim();
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 1 || length > 500) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "回复内容长度必须为1至500字");
        }
        return normalized;
    }

    private String writeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("TIM投递元数据序列化失败", ex);
        }
    }

    private ReplyPreparation requirePreparation(ReplyPreparation value) {
        if (value == null) {
            throw new IllegalStateException("回复事务未返回结果");
        }
        return value;
    }

    private WhisperReplyResult requireReplyResult(WhisperReplyResult value) {
        if (value == null) {
            throw new IllegalStateException("回复最终确认未返回结果");
        }
        return value;
    }

    private String outboxEventKey(String messageNo) {
        return "message:" + messageNo + ":tim";
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String businessNo(String prefix) {
        return prefix + "-" + IdUtil.fastSimpleUUID().toUpperCase();
    }

    private record ReplyPreparation(
            Long whisperId,
            String whisperNo,
            String requestId,
            Long replyMessageId,
            Long outboxId,
            WhisperReplyResult completedResult) {
    }
}
