package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.model.message.WhisperReplyResult;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MessageDomainService;
import com.spacetime.common.service.MessageAnnouncementHydrationService;
import com.spacetime.common.service.MessageNotificationDomainService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.AssistantMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.ConversationBlockReq;
import com.spacetime.miniapp.dto.request.MiniappRelationBlockReq;
import com.spacetime.miniapp.dto.request.MessageReadReq;
import com.spacetime.miniapp.dto.request.SystemMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReplyReq;
import com.spacetime.miniapp.dto.request.WhisperHideAllReq;
import com.spacetime.miniapp.dto.response.AssistantMessageItemVO;
import com.spacetime.miniapp.dto.response.AssistantMessagePageVO;
import com.spacetime.miniapp.dto.response.ConversationBlockVO;
import com.spacetime.miniapp.dto.response.MessageConversationDetailVO;
import com.spacetime.miniapp.dto.response.MessageConversationItemVO;
import com.spacetime.miniapp.dto.response.MessageConversationPageVO;
import com.spacetime.miniapp.dto.response.MessageFemaleProtectionVO;
import com.spacetime.miniapp.dto.response.LikesMeSummaryVO;
import com.spacetime.miniapp.dto.response.MessageChannelSummaryVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.MessageLastMessageVO;
import com.spacetime.miniapp.dto.response.MessagePeerUserVO;
import com.spacetime.miniapp.dto.response.MessageReadBatchVO;
import com.spacetime.miniapp.dto.response.MessageReadVO;
import com.spacetime.miniapp.dto.response.MessageReportContextVO;
import com.spacetime.miniapp.dto.response.MessageUnreadSummaryVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperActionsVO;
import com.spacetime.miniapp.dto.response.MessageWhisperItemVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.MessageWhisperSummaryVO;
import com.spacetime.miniapp.dto.response.SystemMessageItemVO;
import com.spacetime.miniapp.dto.response.SystemMessagePageVO;
import com.spacetime.miniapp.dto.response.SystemMessageReadAckVO;
import com.spacetime.miniapp.dto.response.WhisperReplyVO;
import com.spacetime.miniapp.dto.response.WhisperHideVO;
import com.spacetime.miniapp.service.MiniappMessageService;
import com.spacetime.miniapp.service.MiniappRelationService;
import com.spacetime.miniapp.service.MiniappSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 小程序消息业务状态查询。
 *
 * <p>本服务返回平台掌握的消息首页投影、悄悄话业务状态和有效会话白名单。
 * 悄悄话详情在正文留存期内从消息主表返回完整正文；普通私信发送、实时接收和漫游历史
 * 仍由 TIM 承接，平台保存消息明文归档、最新摘要、发送状态和接收方已读事实。</p>
 */
@Service
@RequiredArgsConstructor
public class MiniappMessageServiceImpl implements MiniappMessageService {
    private static final int MESSAGE_PARAM_ERROR = 4001;
    private static final int MESSAGE_NOT_FOUND = 404;
    private static final int MESSAGE_FORBIDDEN = 403;
    private static final int MESSAGE_IM_UNAVAILABLE = 30023;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 50;
    private static final int MAX_WHISPER_SIZE = 20;
    private static final int HOME_WHISPER_AVATAR_LIMIT = 3;
    private static final int MESSAGE_PREVIEW_LENGTH = 50;

    private final AppMessageWhisperDao whisperDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageConversationMemberDao memberDao;
    private final AppMessageRecordDao recordDao;
    private final AppUserDao appUserDao;
    private final AppUserImAccountDao imAccountDao;
    private final AppAssistantMessageDao assistantMessageDao;
    private final AppSystemMessageDao systemMessageDao;
    private final AppUserAuditContentService auditContentService;
    private final MessageDomainService messageDomainService;
    private final MessageNotificationDomainService notificationDomainService;
    private final MessageAnnouncementHydrationService announcementHydrationService;
    private final RelationAccessProjectionService accessProjectionService;
    private final MiniappSettingService settingService;
    private final SensitiveTextCipher sensitiveTextCipher;
    private final MiniappRelationService relationService;

    @Override
    public MessageHomeVO home(Long userId, String cursor, int size) {
        LocalDateTime now = LocalDateTime.now();
        boolean restricted = isRestricted(userId);
        if (!restricted) {
            notificationDomainService.ensureAssistantMessages(userId, now);
            announcementHydrationService.hydrate(userId, now);
        }
        MessageUnreadSummaryVO summary = unreadSummary(userId, now, restricted);

        MessageHomeVO result = new MessageHomeVO();
        result.setAccessMode(restricted ? "restricted" : "normal");
        result.setRestrictionPrompt(restricted
                ? "当前仅可查看账号安全、处罚和申诉消息" : null);
        result.setUnreadSummary(summary);
        if (restricted) {
            result.setWhisperSummary(emptyWhisperSummary());
            result.setLikesMeSummary(emptyLikesMeSummary());
            result.setAssistantSummary(emptyChannelSummary());
            result.setSystemSummary(systemSummary(userId, now, true,
                    summary.getSystemUnreadCount()));
            result.setConversationPage(emptyConversationPage());
            return result;
        }

        result.setWhisperSummary(whisperSummary(userId, now));
        result.setLikesMeSummary(relationService.likesMeSummary(userId));
        result.setAssistantSummary(assistantSummary(userId, now,
                summary.getAssistantUnreadCount()));
        result.setSystemSummary(systemSummary(userId, now, false,
                summary.getSystemUnreadCount()));
        result.setConversationPage(conversations(userId, cursor, size));
        return result;
    }

    @Override
    public MessageUnreadSummaryVO unreadSummary(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        boolean restricted = isRestricted(userId);
        if (!restricted) {
            notificationDomainService.ensureAssistantMessages(userId, now);
            announcementHydrationService.hydrate(userId, now);
        }
        return unreadSummary(userId, now, restricted);
    }

    @Override
    public MessageWhisperPageVO whispers(Long userId, String direction, String bucket,
                                         String cursor, int size) {
        requireDirection(direction);
        requireBucket(direction, bucket);
        int pageSize = whisperPageSize(size);
        String cursorScope = direction + ":" + bucket;
        Long cursorId = decodeCursor(cursor, "whisper", userId, cursorScope);
        LocalDateTime now = LocalDateTime.now();
        List<AppMessageWhisper> queried = whisperDao.selectVisible(
                userId, direction, bucket, cursorId, pageSize + 1, now);
        boolean hasMore = queried.size() > pageSize;
        List<AppMessageWhisper> rows = new ArrayList<>(
                queried.subList(0, Math.min(pageSize, queried.size())));

        List<Long> peerIds = rows.stream().map(row -> peerUserId(row, direction)).distinct().toList();
        Map<Long, AppUser> users = usersById(peerIds);
        Map<Long, String> avatars = peerIds.isEmpty()
                ? Map.of() : auditContentService.publicAvatars(peerIds);

        MessageWhisperPageVO result = new MessageWhisperPageVO();
        result.setDirection(direction);
        result.setBucket(bucket);
        result.setTotalCount(whisperDao.countVisible(userId, direction, bucket, now));
        result.setList(rows.stream()
                .map(row -> toWhisperItem(row, direction, users, avatars, now))
                .toList());
        result.setHasMore(hasMore);
        result.setNextCursor(hasMore && !rows.isEmpty()
                ? encodeCursor("whisper", userId, cursorScope, rows.getLast().getId()) : null);
        return result;
    }

    @Override
    public MessageWhisperDetailVO whisperDetail(Long userId, String whisperNo) {
        AppMessageWhisper whisper = requireWhisperParticipant(userId, whisperNo);
        String direction = Objects.equals(userId, whisper.getReceiverUserId()) ? "received" : "sent";
        Long peerId = peerUserId(whisper, direction);
        AppMessageRecord request = whisper.getRequestMessageId() == null
                ? null : recordDao.selectById(whisper.getRequestMessageId());
        LocalDateTime now = LocalDateTime.now();

        MessageWhisperDetailVO result = new MessageWhisperDetailVO();
        result.setWhisperNo(whisper.getWhisperNo());
        result.setDirection(direction);
        result.setStatus(effectiveStatus(whisper, now));
        result.setDisplayStatus(displayStatus(whisper, direction, now));
        result.setPeerUser(toPeerUser(peerId, appUserDao.selectById(peerId),
                auditContentService.publicAvatar(peerId)));
        boolean contentAvailable = request != null
                && request.getContentClearedAt() == null
                && StringUtils.hasText(request.getContentText());
        result.setContent(contentAvailable ? request.getContentText() : null);
        result.setContentAvailable(contentAvailable);
        result.setRequestMessageNo(request == null ? null : request.getMessageNo());
        result.setCreatedTime(whisper.getCreateTime());
        result.setExpireTime(whisper.getExpiresAt());
        result.setProcessedTime(processedTime(whisper, now));
        result.setRemainingSeconds(remainingSeconds(whisper.getExpiresAt(), now));
        result.setConversationNo(whisper.getConversationNo());
        result.setActions(whisperActions(whisper, direction, contentAvailable,
                result.getPeerUser(), now));
        return result;
    }

    @Override
    public WhisperHideVO hideWhisper(Long userId, String whisperNo) {
        AppMessageWhisper whisper = requireWhisperParticipant(userId, whisperNo);
        if (!Objects.equals(userId, whisper.getReceiverUserId())) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "只有申请接收方可以删除悄悄话");
        }
        LocalDateTime now = LocalDateTime.now();
        int hidden = whisperDao.hideByReceiver(userId, whisperNo, "single", now);
        if (hidden == 0) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话已删除或不存在");
        }
        WhisperHideVO result = new WhisperHideVO();
        result.setWhisperNo(whisperNo);
        result.setBucket(bucketOf(whisper, now));
        result.setHiddenCount(hidden);
        result.setHiddenTime(now);
        return result;
    }

    @Override
    public WhisperHideVO hideReceivedWhispers(Long userId, WhisperHideAllReq req) {
        String bucket = req == null ? null : req.getBucket();
        requireBucket("received", bucket);
        LocalDateTime now = LocalDateTime.now();
        int hidden = whisperDao.hideBucketByReceiver(userId, bucket, "bucket", now);
        WhisperHideVO result = new WhisperHideVO();
        result.setBucket(bucket);
        result.setHiddenCount(hidden);
        result.setHiddenTime(now);
        return result;
    }

    @Override
    public WhisperReplyVO replyWhisper(Long userId, String whisperNo, WhisperReplyReq req) {
        // 接收方已逻辑删除后不允许绕过列表和详情直接回复旧申请。
        requireWhisperParticipant(userId, whisperNo);
        if (req == null || !StringUtils.hasText(req.getRequestId())
                || !StringUtils.hasText(req.getContent())) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "回复悄悄话参数不完整");
        }
        String content = req.getContent().trim();
        int length = content.codePointCount(0, content.length());
        if (length < 1 || length > 500) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "回复内容长度必须为1至500字");
        }
        LocalDateTime repliedAt = LocalDateTime.now();
        WhisperReplyResult domainResult = messageDomainService.replyWhisper(
                userId, whisperNo, req.getRequestId(), content, repliedAt);
        recordDao.markWhisperRequestsRead(userId, List.of(whisperNo), repliedAt);
        WhisperReplyVO result = new WhisperReplyVO();
        result.setWhisperNo(domainResult.whisperNo());
        result.setStatus(domainResult.status());
        result.setMatchNo(domainResult.matchNo());
        result.setConversationNo(domainResult.conversationNo());
        result.setReplyMessageNo(domainResult.replyMessageNo());
        result.setRepliedTime(domainResult.repliedAt());
        return result;
    }

    @Override
    public MessageConversationPageVO conversations(Long userId, String cursor, int size) {
        int pageSize = pageSize(size);
        ConversationCursor decoded = decodeConversationCursor(cursor, userId);
        List<AppMessageConversation> queried = conversationDao.selectActiveByUser(
                userId,
                decoded == null ? null : decoded.lastMessageTime(),
                decoded == null ? null : decoded.id(),
                pageSize + 1);
        boolean hasMore = queried.size() > pageSize;
        List<AppMessageConversation> rows = new ArrayList<>(
                queried.subList(0, Math.min(pageSize, queried.size())));
        List<Long> conversationIds = rows.stream().map(AppMessageConversation::getId).toList();
        Map<Long, AppMessageConversationMember> members = memberDao
                .selectByUserAndConversations(userId, conversationIds).stream()
                .collect(Collectors.toMap(AppMessageConversationMember::getConversationId,
                        Function.identity(), (left, right) -> left));
        List<Long> peerIds = rows.stream()
                .map(row -> members.get(row.getId()))
                .filter(Objects::nonNull)
                .map(AppMessageConversationMember::getPeerUserId)
                .distinct()
                .toList();
        Map<Long, AppUser> users = usersById(peerIds);
        Map<Long, String> avatars = peerIds.isEmpty()
                ? Map.of() : auditContentService.publicAvatars(peerIds);
        Map<Long, AppMessageRecord> latestMessages = messagesById(rows.stream()
                .map(AppMessageConversation::getLastMessageId)
                .filter(Objects::nonNull)
                .toList());

        MessageConversationPageVO result = new MessageConversationPageVO();
        result.setList(rows.stream().map(row -> {
            AppMessageConversationMember member = members.get(row.getId());
            if (member == null) {
                throw new BusinessException(MESSAGE_FORBIDDEN, "私信会话成员状态异常");
            }
            Long peerId = member.getPeerUserId();
            MessageConversationItemVO item = new MessageConversationItemVO();
            item.setConversationNo(row.getConversationNo());
            item.setPeerUser(toPeerUser(peerId, users.get(peerId), avatars.get(peerId)));
            item.setUnreadCount(recordDao.countUnreadByConversation(row.getId(), userId));
            AppMessageRecord latestMessage = row.getLastMessageId() == null
                    ? null : latestMessages.get(row.getLastMessageId());
            item.setLastMessage(toLastMessage(latestMessage, userId));
            return item;
        }).toList());
        result.setHasMore(hasMore);
        result.setNextCursor(hasMore && !rows.isEmpty()
                ? encodeConversationCursor(userId, rows.getLast()) : null);
        return result;
    }

    @Override
    public MessageConversationDetailVO conversationDetail(Long userId, String conversationNo) {
        AppMessageConversation conversation = conversationDao.selectByConversationNo(conversationNo);
        if (conversation == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "私信会话不存在");
        }
        AppMessageConversationMember member = memberDao.selectByConversationAndUser(
                conversation.getId(), userId);
        if (member == null) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权查看该私信会话");
        }
        Long peerId = member.getPeerUserId();
        boolean active = MessageConversationStatusEnum.ACTIVE.getCode().equals(
                conversation.getStatus());
        SendPermission permission = active
                ? sendPermission(conversation, userId, LocalDateTime.now())
                : new SendPermission(true, false, "conversation_invalid");
        boolean canReportChat = recordDao.existsReportableIncomingText(
                conversation.getId(), userId);
        String timConversationId = active
                ? timConversationId(peerId) : optionalTimConversationId(peerId);

        MessageFemaleProtectionVO protection = new MessageFemaleProtectionVO();
        protection.setEnabled(Integer.valueOf(1).equals(conversation.getProtectionEnabled()));
        protection.setWaitingForFemaleFirstMessage("female_protection".equals(permission.reason()));
        protection.setProtectionUntil(conversation.getProtectionUntil());

        MessageConversationDetailVO result = new MessageConversationDetailVO();
        result.setConversationNo(conversation.getConversationNo());
        result.setTimConversationId(timConversationId);
        result.setConversationStatus(conversation.getStatus());
        result.setAccessMode(active ? "normal" : "safety_readonly");
        MessagePeerUserVO peerUser = active
                ? toPeerUser(peerId, appUserDao.selectById(peerId),
                        auditContentService.publicAvatar(peerId))
                : toSafetyReadonlyPeer(peerId);
        result.setPeerUser(peerUser);
        result.setCanEnterConversation(permission.canEnter() && timConversationId != null);
        result.setCanSend(permission.canSend());
        result.setSendBlockedReason(permission.reason());
        result.setCanReportChat(canReportChat);
        if (canReportChat) {
            MessageReportContextVO reportContext = new MessageReportContextVO();
            reportContext.setSourceType("private_chat");
            reportContext.setConversationNo(conversation.getConversationNo());
            reportContext.setTimConversationId(timConversationId);
            result.setReportContext(reportContext);
        }
        result.setFemaleProtection(protection);
        result.setSafetyActions(active
                ? (canReportChat
                    ? List.of("report_chat", "block", "block_and_report")
                    : List.of("block"))
                : (canReportChat ? List.of("report_chat") : List.of()));
        return result;
    }

    @Override
    @Transactional
    public MessageReadVO readConversation(Long userId, String conversationNo, MessageReadReq req) {
        AppMessageConversation conversation = conversationDao.selectByConversationNo(conversationNo);
        if (conversation == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "私信会话不存在");
        }
        if (memberDao.selectByConversationAndUser(conversation.getId(), userId) == null) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权操作该私信会话");
        }
        AppMessageRecord lastMessage = resolveReadMessage(conversation, req);
        if (lastMessage == null || !Objects.equals(conversation.getId(), lastMessage.getConversationId())) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "最后已读消息不属于当前会话");
        }
        LocalDateTime readAt = LocalDateTime.now();
        LocalDateTime lastReadMessageTime = firstNonNull(
                lastMessage.getSentAt(), lastMessage.getProviderSentAt(), lastMessage.getCreateTime());
        if (lastReadMessageTime != null) {
            memberDao.advanceReadWatermark(
                    conversation.getId(), userId, lastReadMessageTime, readAt);
        }
        recordDao.markReadThrough(conversation.getId(), userId, lastMessage.getId(), readAt);

        MessageReadVO result = new MessageReadVO();
        result.setConversationNo(conversationNo);
        result.setLastReadMessageNo(lastMessage.getMessageNo());
        result.setUnreadCount(Math.toIntExact(recordDao.countUnreadByConversation(
                conversation.getId(), userId)));
        result.setReadAt(readAt);
        return result;
    }

    private AppMessageRecord resolveReadMessage(AppMessageConversation conversation,
                                                 MessageReadReq req) {
        if (req == null) {
            return null;
        }
        AppMessageRecord record;
        if (StringUtils.hasText(req.getLastMessageNo())) {
            record = recordDao.selectByMessageNo(req.getLastMessageNo());
            if (record != null && (StringUtils.hasText(req.getTimMessageId())
                    && !Objects.equals(req.getTimMessageId(), record.getTimMessageId())
                    || StringUtils.hasText(req.getTimMsgKey())
                    && !Objects.equals(req.getTimMsgKey(), record.getTimMsgKey()))) {
                return null;
            }
            return record;
        }
        return recordDao.selectByConversationAndTimLocator(
                conversation.getId(), req.getTimMessageId(), req.getTimMsgKey());
    }

    @Override
    public ConversationBlockVO blockConversation(Long userId, String conversationNo,
                                                   ConversationBlockReq req) {
        AppMessageConversation conversation = conversationDao.selectByConversationNo(conversationNo);
        if (conversation == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "私信会话不存在");
        }
        AppMessageConversationMember member = memberDao.selectByConversationAndUser(
                conversation.getId(), userId);
        if (member == null) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权操作该私信会话");
        }
        MiniappRelationBlockReq blockReq = new MiniappRelationBlockReq();
        blockReq.setTargetUserId(member.getPeerUserId());
        blockReq.setSourceScene(req == null ? null : req.getSourceScene());
        Long blockId = settingService.addBlock(
                userId, RelationBlockTypeEnum.BLACKLIST.getCode(), blockReq);

        ConversationBlockVO result = new ConversationBlockVO();
        result.setConversationNo(conversationNo);
        result.setConversationStatus(MessageConversationStatusEnum.BLOCKED.getCode());
        result.setBlockNo("BLK-" + blockId);
        result.setCanSend(false);
        return result;
    }

    @Override
    public MessageReadBatchVO readWhispers(Long userId, WhisperReadBatchReq req) {
        LocalDateTime now = LocalDateTime.now();
        boolean restricted = isRestricted(userId);
        if (restricted) {
            return readBatchResult(List.of(), 0, unreadSummary(userId, now, true));
        }
        List<String> submitted = distinctNos(req == null ? null : req.getWhisperNos());
        List<String> accepted = whisperDao.selectReadableNos(userId, submitted, now);
        int updated = whisperDao.markReadBatch(userId, accepted, now);
        recordDao.markWhisperRequestsRead(userId, accepted, now);
        return readBatchResult(accepted, updated, unreadSummary(userId, now, false));
    }

    @Override
    public AssistantMessagePageVO assistantMessages(Long userId, String cursor, int size) {
        int pageSize = pageSize(size);
        if (isRestricted(userId)) {
            AssistantMessagePageVO empty = new AssistantMessagePageVO();
            empty.setList(List.of());
            empty.setHasMore(false);
            return empty;
        }
        notificationDomainService.ensureAssistantMessages(userId, LocalDateTime.now());
        Long cursorId = decodeCursor(cursor, "message", userId, "assistant");
        List<AppAssistantMessage> queried = assistantMessageDao.selectVisible(
                userId, cursorId, pageSize + 1, LocalDateTime.now());
        boolean hasMore = queried.size() > pageSize;
        List<AppAssistantMessage> rows = queried.subList(0, Math.min(pageSize, queried.size()));

        AssistantMessagePageVO result = new AssistantMessagePageVO();
        result.setList(rows.stream().map(this::toAssistantMessage).toList());
        result.setHasMore(hasMore);
        result.setNextCursor(hasMore && !rows.isEmpty()
                ? encodeCursor("message", userId, "assistant", rows.getLast().getId()) : null);
        return result;
    }

    @Override
    public MessageReadBatchVO readAssistantMessages(Long userId,
                                                      AssistantMessageReadBatchReq req) {
        LocalDateTime now = LocalDateTime.now();
        boolean restricted = isRestricted(userId);
        if (restricted) {
            return readBatchResult(List.of(), 0, unreadSummary(userId, now, true));
        }
        List<String> submitted = distinctNos(req == null ? null : req.getMessageNos());
        List<String> accepted = assistantMessageDao.selectReadableNos(userId, submitted, now);
        int updated = assistantMessageDao.markReadBatch(userId, accepted, now);
        return readBatchResult(accepted, updated, unreadSummary(userId, now, false));
    }

    @Override
    public SystemMessagePageVO systemMessages(Long userId, String cursor, int size) {
        int pageSize = pageSize(size);
        boolean restricted = isRestricted(userId);
        LocalDateTime now = LocalDateTime.now();
        if (!restricted) {
            announcementHydrationService.hydrate(userId, now);
        }
        Long cursorId = decodeCursor(cursor, "message", userId, "system");
        List<AppSystemMessage> queried = systemMessageDao.selectVisible(
                userId, cursorId, pageSize + 1, now, restricted);
        boolean hasMore = queried.size() > pageSize;
        List<AppSystemMessage> rows = queried.subList(0, Math.min(pageSize, queried.size()));

        SystemMessagePageVO result = new SystemMessagePageVO();
        result.setList(rows.stream().map(this::toSystemMessage).toList());
        result.setHasMore(hasMore);
        result.setNextCursor(hasMore && !rows.isEmpty()
                ? encodeCursor("message", userId, "system", rows.getLast().getId()) : null);
        SystemMessageReadAckVO readAck = new SystemMessageReadAckVO();
        readAck.setNoticeNos(rows.stream().map(AppSystemMessage::getNoticeNo).toList());
        result.setReadAck(readAck);
        return result;
    }

    @Override
    public MessageReadBatchVO readSystemMessages(Long userId, SystemMessageReadBatchReq req) {
        LocalDateTime now = LocalDateTime.now();
        boolean restricted = isRestricted(userId);
        List<String> submitted = distinctNos(req == null ? null : req.getNoticeNos());
        List<String> accepted = systemMessageDao.selectReadableNos(
                userId, submitted, now, restricted);
        int updated = systemMessageDao.markReadBatch(userId, accepted, now);
        return readBatchResult(accepted, updated, unreadSummary(userId, now, restricted));
    }

    private MessageUnreadSummaryVO unreadSummary(Long userId, LocalDateTime now,
                                                  boolean restricted) {
        long privateUnread = restricted ? 0L : recordDao.countUnreadByReceiver(userId);
        long whisperUnread = restricted ? 0L : whisperDao.countUnreadPending(userId, now);
        long assistantUnread = restricted ? 0L : assistantMessageDao.countUnreadVisible(userId, now);
        long systemUnread = systemMessageDao.countUnreadVisible(userId, now, restricted);
        MessageUnreadSummaryVO result = new MessageUnreadSummaryVO();
        result.setPrivateUnreadCount(privateUnread);
        result.setWhisperUnreadCount(whisperUnread);
        result.setAssistantUnreadCount(assistantUnread);
        result.setSystemUnreadCount(systemUnread);
        result.setMessageUnreadCount(privateUnread + whisperUnread + assistantUnread + systemUnread);
        result.setSnapshotTime(now);
        return result;
    }

    private MessageWhisperSummaryVO whisperSummary(Long userId, LocalDateTime now) {
        List<AppMessageWhisper> rows = whisperDao.selectPending(
                userId, "received", null, HOME_WHISPER_AVATAR_LIMIT, now);
        List<Long> senderIds = rows.stream().map(AppMessageWhisper::getSenderUserId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, String> avatars = senderIds.isEmpty()
                ? Map.of() : auditContentService.publicAvatars(senderIds);
        MessageWhisperSummaryVO result = new MessageWhisperSummaryVO();
        result.setPendingCount(whisperDao.countPending(userId, now));
        result.setRecentAvatarUrls(senderIds.stream().map(avatars::get)
                .filter(StringUtils::hasText).limit(HOME_WHISPER_AVATAR_LIMIT).toList());
        return result;
    }

    private MessageChannelSummaryVO assistantSummary(Long userId, LocalDateTime now,
                                                       Long unreadCount) {
        List<AppAssistantMessage> rows = assistantMessageDao.selectVisible(userId, null, 1, now);
        AppAssistantMessage latest = rows.isEmpty() ? null : rows.getFirst();
        MessageChannelSummaryVO result = new MessageChannelSummaryVO();
        result.setUnreadCount(unreadCount);
        if (latest != null) {
            result.setLatestPreview(preview(plainOrDecrypt(latest.getContentText(), latest.getContentCiphertext(),
                    latest.getContentIv(), latest.getContentKeyVersion(), latest.getContentHmac())));
            result.setLatestTime(latest.getCreateTime());
        }
        return result;
    }

    private MessageChannelSummaryVO systemSummary(Long userId, LocalDateTime now,
                                                   boolean safetyOnly, Long unreadCount) {
        List<AppSystemMessage> rows = systemMessageDao.selectVisible(userId, null, 1, now, safetyOnly);
        AppSystemMessage latest = rows.isEmpty() ? null : rows.getFirst();
        MessageChannelSummaryVO result = new MessageChannelSummaryVO();
        result.setUnreadCount(unreadCount);
        if (latest != null) {
            result.setLatestPreview(preview(plainOrDecrypt(latest.getContentText(), latest.getContentCiphertext(),
                    latest.getContentIv(), latest.getContentKeyVersion(), latest.getContentHmac())));
            result.setLatestTime(latest.getCreateTime());
        }
        return result;
    }

    private MessageLastMessageVO toLastMessage(AppMessageRecord message, Long userId) {
        if (message == null) {
            return null;
        }
        MessageLastMessageVO result = new MessageLastMessageVO();
        result.setMessageNo(message.getMessageNo());
        result.setMessageType(message.getMessageType());
        result.setDirection(Objects.equals(userId, message.getSenderUserId())
                ? "outgoing" : "incoming");
        result.setPreview(preview(message.getContentText()));
        result.setMessageTime(message.getSentAt() == null
                ? message.getCreateTime() : message.getSentAt());
        result.setSendStatus(message.getSendStatus());
        return result;
    }

    private String preview(String content) {
        if (!StringUtils.hasText(content)) {
            return null;
        }
        String normalized = content.trim().replaceAll("\\s+", " ");
        int count = normalized.codePointCount(0, normalized.length());
        if (count <= MESSAGE_PREVIEW_LENGTH) {
            return normalized;
        }
        int end = normalized.offsetByCodePoints(0, MESSAGE_PREVIEW_LENGTH);
        return normalized.substring(0, end);
    }

    private MessageWhisperSummaryVO emptyWhisperSummary() {
        MessageWhisperSummaryVO result = new MessageWhisperSummaryVO();
        result.setPendingCount(0L);
        result.setRecentAvatarUrls(List.of());
        return result;
    }

    private LikesMeSummaryVO emptyLikesMeSummary() {
        LikesMeSummaryVO result = new LikesMeSummaryVO();
        result.setTotalCount(0L);
        result.setNewCount(0L);
        return result;
    }

    private MessageChannelSummaryVO emptyChannelSummary() {
        MessageChannelSummaryVO result = new MessageChannelSummaryVO();
        result.setUnreadCount(0L);
        return result;
    }

    private MessageConversationPageVO emptyConversationPage() {
        MessageConversationPageVO result = new MessageConversationPageVO();
        result.setList(List.of());
        result.setHasMore(false);
        return result;
    }

    private MessageReadBatchVO readBatchResult(List<String> acceptedNos, int updatedCount,
                                                MessageUnreadSummaryVO summary) {
        MessageReadBatchVO result = new MessageReadBatchVO();
        result.setAcceptedNos(acceptedNos);
        result.setUpdatedCount(updatedCount);
        result.setPlatformUnreadSummary(summary);
        return result;
    }

    private AssistantMessageItemVO toAssistantMessage(AppAssistantMessage source) {
        AssistantMessageItemVO result = new AssistantMessageItemVO();
        result.setAssistantMessageNo(source.getAssistantMessageNo());
        result.setTopicCode(source.getTopicCode());
        result.setTitle(plainOrDecrypt(source.getTitleText(), source.getTitleCiphertext(), source.getTitleIv(),
                source.getTitleKeyVersion(), source.getTitleHmac()));
        result.setContent(plainOrDecrypt(source.getContentText(), source.getContentCiphertext(), source.getContentIv(),
                source.getContentKeyVersion(), source.getContentHmac()));
        result.setCardType(source.getCardType());
        result.setActionType(source.getActionType());
        result.setActionText(source.getActionText());
        result.setActionValue(source.getActionValue());
        result.setReadStatus(source.getReadAt() == null ? "unread" : "read");
        result.setCreatedTime(source.getCreateTime());
        return result;
    }

    private SystemMessageItemVO toSystemMessage(AppSystemMessage source) {
        SystemMessageItemVO result = new SystemMessageItemVO();
        result.setNoticeNo(source.getNoticeNo());
        result.setNotificationType(source.getNotificationType());
        result.setBizType(source.getBizType());
        result.setTitle(plainOrDecrypt(source.getTitleText(), source.getTitleCiphertext(), source.getTitleIv(),
                source.getTitleKeyVersion(), source.getTitleHmac()));
        result.setContent(plainOrDecrypt(source.getContentText(), source.getContentCiphertext(), source.getContentIv(),
                source.getContentKeyVersion(), source.getContentHmac()));
        result.setContentFormat(source.getContentFormat());
        result.setReadStatus(source.getReadAt() == null ? "unread" : "read");
        result.setJumpType(source.getJumpType());
        result.setActionText(source.getActionText());
        result.setJumpValue(source.getJumpValue());
        result.setCreatedTime(source.getCreateTime());
        return result;
    }

    private String decryptText(byte[] ciphertext, byte[] iv, String keyVersion, String hmac) {
        if (ciphertext == null || ciphertext.length == 0) {
            return null;
        }
        return sensitiveTextCipher.decrypt(new EncryptedMessageContent(
                ciphertext, iv, keyVersion, hmac));
    }

    private String plainOrDecrypt(String plaintext, byte[] ciphertext, byte[] iv,
                                  String keyVersion, String hmac) {
        return StringUtils.hasText(plaintext) ? plaintext
                : decryptText(ciphertext, iv, keyVersion, hmac);
    }

    private boolean isRestricted(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "用户不存在");
        }
        return !"OPEN".equals(accessProjectionService.project(user));
    }

    private List<String> distinctNos(List<String> values) {
        if (values == null || values.isEmpty() || values.size() > MAX_SIZE) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "批次编号数量必须为1至50条");
        }
        List<String> result = values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        if (result.isEmpty()) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "批次编号不能为空");
        }
        return result;
    }

    private MessageWhisperItemVO toWhisperItem(AppMessageWhisper row, String direction,
                                                Map<Long, AppUser> users,
                                                Map<Long, String> avatars,
                                                LocalDateTime now) {
        Long peerId = peerUserId(row, direction);
        MessageWhisperItemVO item = new MessageWhisperItemVO();
        item.setWhisperNo(row.getWhisperNo());
        item.setDirection(direction);
        item.setStatus(effectiveStatus(row, now));
        item.setDisplayStatus(displayStatus(row, direction, now));
        item.setPeerUser(toPeerUser(peerId, users.get(peerId), avatars.get(peerId)));
        item.setPayType(row.getPayType());
        item.setCreatedTime(row.getCreateTime());
        item.setExpireTime(row.getExpiresAt());
        item.setCanReply(canReply(row, direction, now));
        item.setUnread("received".equals(direction) ? row.getReceiverReadAt() == null : null);
        return item;
    }

    private SendPermission sendPermission(AppMessageConversation conversation, Long userId,
                                           LocalDateTime now) {
        if (!MessageConversationStatusEnum.ACTIVE.getCode().equals(conversation.getStatus())) {
            return new SendPermission(false, false, "conversation_invalid");
        }
        boolean waitingForFemale = Integer.valueOf(1).equals(conversation.getProtectionEnabled())
                && Objects.equals(userId, conversation.getMaleUserId())
                && conversation.getFemaleFirstMessageAt() == null
                && (conversation.getProtectionUntil() == null
                    || now.isBefore(conversation.getProtectionUntil()));
        return waitingForFemale
                ? new SendPermission(true, false, "female_protection")
                : new SendPermission(true, true, null);
    }

    private MessagePeerUserVO toPeerUser(Long peerId, AppUser user, String avatar) {
        MessagePeerUserVO peer = new MessagePeerUserVO();
        peer.setUserId(peerId);
        peer.setNickname(user == null || !StringUtils.hasText(user.getNickname())
                ? "用户" + peerId : user.getNickname());
        peer.setAvatarUrl(avatar);
        peer.setProfileAvailable(user != null
                && AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus()));
        return peer;
    }

    private MessagePeerUserVO toSafetyReadonlyPeer(Long peerId) {
        MessagePeerUserVO peer = new MessagePeerUserVO();
        peer.setUserId(peerId);
        peer.setNickname("用户已不可互动");
        peer.setAvatarUrl(null);
        peer.setProfileAvailable(false);
        return peer;
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        if (values == null) {
            return null;
        }
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private AppMessageWhisper requireWhisperParticipant(Long userId, String whisperNo) {
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(whisperNo);
        if (whisper == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话不存在");
        }
        if (!Objects.equals(userId, whisper.getSenderUserId())
                && !Objects.equals(userId, whisper.getReceiverUserId())) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权查看该悄悄话");
        }
        if (Objects.equals(userId, whisper.getReceiverUserId())
                && whisper.getReceiverHiddenAt() != null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话已删除或不存在");
        }
        return whisper;
    }

    private Map<Long, AppUser> usersById(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<AppUser> users = appUserDao.selectByIds(new ArrayList<>(new LinkedHashSet<>(ids)));
        return users == null ? Map.of() : users.stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, AppMessageRecord> messagesById(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<Long> distinct = new ArrayList<>(new LinkedHashSet<>(ids));
        return recordDao.selectByIds(distinct).stream()
                .collect(Collectors.toMap(AppMessageRecord::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, AppUserImAccount> imAccountsByUserId(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<Long> distinct = new ArrayList<>(new LinkedHashSet<>(userIds));
        return imAccountDao.selectByUserIds(distinct).stream()
                .collect(Collectors.toMap(AppUserImAccount::getUserId, Function.identity(),
                        (left, right) -> left));
    }

    private Long peerUserId(AppMessageWhisper whisper, String direction) {
        return "received".equals(direction) ? whisper.getSenderUserId() : whisper.getReceiverUserId();
    }

    private String timConversationId(Long peerUserId) {
        return timConversationId(peerUserId,
                peerUserId == null ? Map.of() : Map.of(peerUserId, requireImAccount(peerUserId)));
    }

    private String optionalTimConversationId(Long peerUserId) {
        if (peerUserId == null) {
            return null;
        }
        AppUserImAccount account = imAccountDao.selectByUserId(peerUserId);
        return account == null || !StringUtils.hasText(account.getImUserId())
                ? null : "C2C_" + account.getImUserId();
    }

    private String timConversationId(Long peerUserId, Map<Long, AppUserImAccount> accounts) {
        AppUserImAccount account = peerUserId == null ? null : accounts.get(peerUserId);
        if (account == null || !StringUtils.hasText(account.getImUserId())) {
            throw new BusinessException(MESSAGE_IM_UNAVAILABLE, "对方即时通信账号暂不可用");
        }
        return "C2C_" + account.getImUserId();
    }

    private AppUserImAccount requireImAccount(Long peerUserId) {
        AppUserImAccount account = imAccountDao.selectByUserId(peerUserId);
        if (account == null || !StringUtils.hasText(account.getImUserId())) {
            throw new BusinessException(MESSAGE_IM_UNAVAILABLE, "对方即时通信账号暂不可用");
        }
        return account;
    }

    private boolean canReply(AppMessageWhisper whisper, String direction, LocalDateTime now) {
        return "received".equals(direction)
                && MessageWhisperStatusEnum.PENDING.getCode().equals(whisper.getStatus())
                && MessageDeliveryStatusEnum.SENT.getCode().equals(whisper.getDeliveryStatus())
                && whisper.getReplyRequestId() == null
                && whisper.getExpiresAt() != null && now.isBefore(whisper.getExpiresAt());
    }

    private String effectiveStatus(AppMessageWhisper whisper, LocalDateTime now) {
        if (MessageWhisperStatusEnum.PENDING.getCode().equals(whisper.getStatus())
                && whisper.getExpiresAt() != null && !now.isBefore(whisper.getExpiresAt())) {
            return MessageWhisperStatusEnum.EXPIRED.getCode();
        }
        return whisper.getStatus();
    }

    private String displayStatus(AppMessageWhisper whisper, String direction, LocalDateTime now) {
        String status = effectiveStatus(whisper, now);
        if (MessageWhisperStatusEnum.PENDING.getCode().equals(status)) {
            return "received".equals(direction) ? "等待你回应" : "等待回应";
        }
        if (MessageWhisperStatusEnum.REPLIED.getCode().equals(status)) {
            return "已回复并匹配";
        }
        return "申请已结束";
    }

    private LocalDateTime processedTime(AppMessageWhisper whisper, LocalDateTime now) {
        String status = effectiveStatus(whisper, now);
        if (MessageWhisperStatusEnum.REPLIED.getCode().equals(status)) {
            return whisper.getRepliedAt();
        }
        if (MessageWhisperStatusEnum.EXPIRED.getCode().equals(status)) {
            return whisper.getInvalidTime() == null ? whisper.getExpiresAt() : whisper.getInvalidTime();
        }
        if (MessageWhisperStatusEnum.INVALID.getCode().equals(status)) {
            return whisper.getInvalidTime();
        }
        return null;
    }

    private MessageWhisperActionsVO whisperActions(AppMessageWhisper whisper, String direction,
                                                     boolean contentAvailable,
                                                     MessagePeerUserVO peerUser,
                                                     LocalDateTime now) {
        String status = effectiveStatus(whisper, now);
        boolean profileAvailable = peerUser != null
                && Boolean.TRUE.equals(peerUser.getProfileAvailable());
        MessageWhisperActionsVO actions = new MessageWhisperActionsVO();
        actions.setCanReply(canReply(whisper, direction, now));
        actions.setCanDelete("received".equals(direction));
        actions.setCanReportWhisperContent(contentAvailable);
        actions.setCanReportPeerUser(profileAvailable);
        actions.setCanReverseApply("received".equals(direction)
                && (MessageWhisperStatusEnum.EXPIRED.getCode().equals(status)
                || MessageWhisperStatusEnum.INVALID.getCode().equals(status))
                && profileAvailable);
        actions.setCanEnterConversation(MessageWhisperStatusEnum.REPLIED.getCode().equals(status)
                && StringUtils.hasText(whisper.getConversationNo()));
        actions.setCanOpenProfile(profileAvailable);
        return actions;
    }

    private String bucketOf(AppMessageWhisper whisper, LocalDateTime now) {
        return MessageWhisperStatusEnum.PENDING.getCode().equals(effectiveStatus(whisper, now))
                ? "pending" : "processed";
    }

    private Long remainingSeconds(LocalDateTime expiresAt, LocalDateTime now) {
        return expiresAt == null ? null : Math.max(0L, Duration.between(now, expiresAt).getSeconds());
    }

    private void requireDirection(String direction) {
        if (!"received".equals(direction) && !"sent".equals(direction)) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "direction仅支持received或sent");
        }
    }

    private void requireBucket(String direction, String bucket) {
        if (!"pending".equals(bucket) && !"processed".equals(bucket)) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "bucket仅支持pending或processed");
        }
        if ("sent".equals(direction) && "processed".equals(bucket)) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "我申请的仅支持pending分组");
        }
    }

    private int pageSize(int size) {
        return size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
    }

    private int whisperPageSize(int size) {
        return size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_WHISPER_SIZE);
    }

    private String encodeCursor(String type, Long userId, String scope, Long id) {
        String raw = "v1|" + type + "|" + userId + "|" + scope + "|" + id;
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private Long decodeCursor(String cursor, String type, Long userId, String scope) {
        if (!StringUtils.hasText(cursor)) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 5 || !"v1".equals(parts[0]) || !type.equals(parts[1])
                    || !Objects.equals(userId, Long.valueOf(parts[2])) || !scope.equals(parts[3])) {
                throw new IllegalArgumentException("cursor mismatch");
            }
            return Long.valueOf(parts[4]);
        } catch (RuntimeException ex) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "分页游标无效");
        }
    }

    private String encodeConversationCursor(Long userId, AppMessageConversation conversation) {
        if (conversation.getLastMessageTime() == null) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "会话排序时间缺失");
        }
        String raw = "v2|conversation|" + userId + "|"
                + conversation.getLastMessageTime() + "|" + conversation.getId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private ConversationCursor decodeConversationCursor(String cursor, Long userId) {
        if (!StringUtils.hasText(cursor)) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 5 || !"v2".equals(parts[0]) || !"conversation".equals(parts[1])
                    || !Objects.equals(userId, Long.valueOf(parts[2]))) {
                throw new IllegalArgumentException("cursor mismatch");
            }
            return new ConversationCursor(LocalDateTime.parse(parts[3]), Long.valueOf(parts[4]));
        } catch (RuntimeException ex) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "分页游标无效");
        }
    }

    private record ConversationCursor(LocalDateTime lastMessageTime, Long id) {
    }

    private record SendPermission(boolean canEnter, boolean canSend, String reason) {
    }
}
