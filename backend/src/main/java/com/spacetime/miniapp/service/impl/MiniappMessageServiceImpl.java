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
import com.spacetime.miniapp.dto.response.AssistantMessageItemVO;
import com.spacetime.miniapp.dto.response.AssistantMessagePageVO;
import com.spacetime.miniapp.dto.response.ConversationBlockVO;
import com.spacetime.miniapp.dto.response.MessageConversationDetailVO;
import com.spacetime.miniapp.dto.response.MessageConversationItemVO;
import com.spacetime.miniapp.dto.response.MessageConversationPageVO;
import com.spacetime.miniapp.dto.response.MessageFemaleProtectionVO;
import com.spacetime.miniapp.dto.response.MessageFixedEntryVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.MessagePeerUserVO;
import com.spacetime.miniapp.dto.response.MessageReadBatchVO;
import com.spacetime.miniapp.dto.response.MessageReadVO;
import com.spacetime.miniapp.dto.response.MessageUnreadSummaryVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperItemVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.SystemMessageItemVO;
import com.spacetime.miniapp.dto.response.SystemMessagePageVO;
import com.spacetime.miniapp.dto.response.SystemMessageReadAckVO;
import com.spacetime.miniapp.dto.response.WhisperReplyVO;
import com.spacetime.miniapp.service.MiniappMessageService;
import com.spacetime.miniapp.service.MiniappSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
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
 * <p>本服务只返回平台掌握的悄悄话状态、有效会话白名单和 TIM 映射，不返回消息主表明文。
 * 普通私信发送和历史由 TIM 承接，平台仅同步维护未读计数所需的接收方已读事实。</p>
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
    private static final int HOME_CONVERSATION_LIMIT = 3;

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

    @Override
    public MessageHomeVO home(Long userId) {
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
        result.setPlatformUnreadSummary(summary);
        result.setRecentConversationLimit(HOME_CONVERSATION_LIMIT);
        if (restricted) {
            result.setFixedEntries(List.of(fixedEntry(
                    "system_message", "系统消息", "你有一条账号安全消息",
                    summary.getSystemUnreadCount())));
            result.setRecentConversationBindings(List.of());
            result.setHasMoreConversations(false);
            return result;
        }

        result.setFixedEntries(List.of(
                fixedEntry("official_assistant", "官方助手", "查看官方助手消息",
                        summary.getAssistantUnreadCount()),
                fixedEntry("system_message", "系统消息", "查看系统消息",
                        summary.getSystemUnreadCount()),
                fixedEntry("whisper", "悄悄话", "查看待处理悄悄话",
                        summary.getWhisperUnreadCount())));
        MessageConversationPageVO conversations = conversations(
                userId, null, HOME_CONVERSATION_LIMIT);
        result.setRecentConversationBindings(conversations.getList());
        result.setHasMoreConversations(conversations.getHasMore());
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
    public MessageWhisperPageVO whispers(Long userId, String direction, String cursor, int size) {
        requireDirection(direction);
        int pageSize = pageSize(size);
        Long cursorId = decodeCursor(cursor, "whisper", userId, direction);
        LocalDateTime now = LocalDateTime.now();
        List<AppMessageWhisper> queried = whisperDao.selectPending(
                userId, direction, cursorId, pageSize + 1, now);
        boolean hasMore = queried.size() > pageSize;
        List<AppMessageWhisper> rows = new ArrayList<>(
                queried.subList(0, Math.min(pageSize, queried.size())));

        List<Long> peerIds = rows.stream().map(row -> peerUserId(row, direction)).distinct().toList();
        Map<Long, AppUser> users = usersById(peerIds);
        Map<Long, AppUserImAccount> imAccounts = imAccountsByUserId(peerIds);
        Map<Long, String> avatars = peerIds.isEmpty()
                ? Map.of() : auditContentService.publicAvatars(peerIds);
        Map<Long, AppMessageRecord> messages = messagesById(rows.stream()
                .map(AppMessageWhisper::getRequestMessageId)
                .filter(Objects::nonNull)
                .toList());

        MessageWhisperPageVO result = new MessageWhisperPageVO();
        result.setList(rows.stream()
                .map(row -> toWhisperItem(row, direction, users, avatars,
                        imAccounts, messages.get(row.getRequestMessageId()), now))
                .toList());
        result.setHasMore(hasMore);
        result.setNextCursor(hasMore && !rows.isEmpty()
                ? encodeCursor("whisper", userId, direction, rows.getLast().getId()) : null);
        return result;
    }

    @Override
    public MessageWhisperDetailVO whisperDetail(Long userId, String whisperNo) {
        AppMessageWhisper whisper = requireWhisperParticipant(userId, whisperNo);
        String direction = Objects.equals(userId, whisper.getReceiverUserId()) ? "received" : "sent";
        Long peerId = peerUserId(whisper, direction);
        List<Long> messageIds = new ArrayList<>();
        if (whisper.getRequestMessageId() != null) {
            messageIds.add(whisper.getRequestMessageId());
        }
        if (whisper.getReplyMessageId() != null) {
            messageIds.add(whisper.getReplyMessageId());
        }
        Map<Long, AppMessageRecord> messages = messagesById(messageIds);
        AppMessageRecord request = messages.get(whisper.getRequestMessageId());
        AppMessageRecord reply = messages.get(whisper.getReplyMessageId());
        LocalDateTime now = LocalDateTime.now();

        MessageWhisperDetailVO result = new MessageWhisperDetailVO();
        result.setWhisperNo(whisper.getWhisperNo());
        result.setDirection(direction);
        result.setStatus(effectiveStatus(whisper, now));
        result.setDisplayStatus(displayStatus(whisper, direction, now));
        result.setPeerUser(toPeerUser(peerId, appUserDao.selectById(peerId),
                auditContentService.publicAvatar(peerId)));
        result.setTimConversationId(timConversationId(peerId));
        result.setRequestTimMessageId(request == null ? null : request.getTimMessageId());
        result.setRequestTimMsgKey(request == null ? null : request.getTimMsgKey());
        result.setReplyMessageNo(reply == null ? null : reply.getMessageNo());
        result.setReplyTimMessageId(reply == null ? null : reply.getTimMessageId());
        result.setReplyTimMsgKey(reply == null ? null : reply.getTimMsgKey());
        result.setCreatedTime(whisper.getCreateTime());
        result.setExpireTime(whisper.getExpiresAt());
        result.setRemainingSeconds(remainingSeconds(whisper.getExpiresAt(), now));
        result.setCanReply(canReply(whisper, direction, now));
        result.setConversationNo(whisper.getConversationNo());
        result.setSafetyActions(List.of("report_whisper", "block", "block_and_report"));
        return result;
    }

    @Override
    public WhisperReplyVO replyWhisper(Long userId, String whisperNo, WhisperReplyReq req) {
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
        result.setReplyTimMessageId(domainResult.replyTimMessageId());
        result.setReplyTimMsgKey(domainResult.replyTimMsgKey());
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
        Map<Long, AppUserImAccount> imAccounts = imAccountsByUserId(peerIds);
        Map<Long, String> avatars = peerIds.isEmpty()
                ? Map.of() : auditContentService.publicAvatars(peerIds);

        MessageConversationPageVO result = new MessageConversationPageVO();
        result.setList(rows.stream().map(row -> {
            AppMessageConversationMember member = members.get(row.getId());
            if (member == null) {
                throw new BusinessException(MESSAGE_FORBIDDEN, "私信会话成员状态异常");
            }
            Long peerId = member.getPeerUserId();
            SendPermission permission = sendPermission(row, userId, LocalDateTime.now());
            MessageConversationItemVO item = new MessageConversationItemVO();
            item.setConversationNo(row.getConversationNo());
            item.setTimConversationId(timConversationId(peerId, imAccounts));
            item.setConversationStatus(row.getStatus());
            item.setPeerUser(toPeerUser(peerId, users.get(peerId), avatars.get(peerId)));
            item.setCanEnterConversation(permission.canEnter());
            item.setCanSend(permission.canSend());
            item.setSendBlockedReason(permission.reason());
            item.setLastBusinessActivityTime(row.getLastMessageTime());
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
        SendPermission permission = sendPermission(conversation, userId, LocalDateTime.now());

        MessageFemaleProtectionVO protection = new MessageFemaleProtectionVO();
        protection.setEnabled(Integer.valueOf(1).equals(conversation.getProtectionEnabled()));
        protection.setWaitingForFemaleFirstMessage("female_protection".equals(permission.reason()));

        MessageConversationDetailVO result = new MessageConversationDetailVO();
        result.setConversationNo(conversation.getConversationNo());
        result.setTimConversationId(timConversationId(peerId));
        result.setConversationStatus(conversation.getStatus());
        result.setPeerUser(toPeerUser(peerId, appUserDao.selectById(peerId),
                auditContentService.publicAvatar(peerId)));
        result.setCanEnterConversation(permission.canEnter());
        result.setCanSend(permission.canSend());
        result.setSendBlockedReason(permission.reason());
        result.setFemaleProtection(protection);
        result.setSafetyActions(List.of("report_user", "block", "block_and_report"));
        return result;
    }

    @Override
    public MessageReadVO readConversation(Long userId, String conversationNo, MessageReadReq req) {
        AppMessageConversation conversation = conversationDao.selectByConversationNo(conversationNo);
        if (conversation == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "私信会话不存在");
        }
        if (memberDao.selectByConversationAndUser(conversation.getId(), userId) == null) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权操作该私信会话");
        }
        AppMessageRecord lastMessage = req == null ? null
                : recordDao.selectByMessageNo(req.getLastMessageNo());
        if (lastMessage == null || !Objects.equals(conversation.getId(), lastMessage.getConversationId())) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "最后已读消息不属于当前会话");
        }
        LocalDateTime readAt = LocalDateTime.now();
        recordDao.markReadThrough(conversation.getId(), userId, lastMessage.getId(), readAt);

        MessageReadVO result = new MessageReadVO();
        result.setConversationNo(conversationNo);
        result.setLastReadMessageNo(lastMessage.getMessageNo());
        result.setUnreadCount(Math.toIntExact(recordDao.countUnreadByConversation(
                conversation.getId(), userId)));
        result.setReadAt(readAt);
        return result;
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
        result.setPlatformUnreadCount(whisperUnread + assistantUnread + systemUnread);
        result.setMessageUnreadCount(privateUnread + whisperUnread + assistantUnread + systemUnread);
        result.setSnapshotTime(now);
        return result;
    }

    private MessageFixedEntryVO fixedEntry(String type, String title, String preview,
                                            Long unreadCount) {
        MessageFixedEntryVO entry = new MessageFixedEntryVO();
        entry.setEntryType(type);
        entry.setTitle(title);
        entry.setLastMessagePreview(preview);
        entry.setUnreadCount(unreadCount);
        entry.setEnabled(true);
        return entry;
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
        result.setTitle(decryptText(source.getTitleCiphertext(), source.getTitleIv(),
                source.getTitleKeyVersion(), source.getTitleHmac()));
        result.setContent(decryptText(source.getContentCiphertext(), source.getContentIv(),
                source.getContentKeyVersion(), source.getContentHmac()));
        result.setActionType(source.getActionType());
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
        result.setTitle(decryptText(source.getTitleCiphertext(), source.getTitleIv(),
                source.getTitleKeyVersion(), source.getTitleHmac()));
        result.setContent(decryptText(source.getContentCiphertext(), source.getContentIv(),
                source.getContentKeyVersion(), source.getContentHmac()));
        result.setReadStatus(source.getReadAt() == null ? "unread" : "read");
        result.setJumpType(source.getJumpType());
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
                                                Map<Long, AppUser> users, Map<Long, String> avatars,
                                                Map<Long, AppUserImAccount> imAccounts,
                                                AppMessageRecord request, LocalDateTime now) {
        Long peerId = peerUserId(row, direction);
        MessageWhisperItemVO item = new MessageWhisperItemVO();
        item.setWhisperNo(row.getWhisperNo());
        item.setDirection(direction);
        item.setStatus(effectiveStatus(row, now));
        item.setDisplayStatus(displayStatus(row, direction, now));
        item.setPeerUser(toPeerUser(peerId, users.get(peerId), avatars.get(peerId)));
        item.setTimConversationId(timConversationId(peerId, imAccounts));
        item.setRequestTimMessageId(request == null ? null : request.getTimMessageId());
        item.setRequestTimMsgKey(request == null ? null : request.getTimMsgKey());
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
                && conversation.getProtectionUntil() != null
                && now.isBefore(conversation.getProtectionUntil());
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

    private AppMessageWhisper requireWhisperParticipant(Long userId, String whisperNo) {
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(whisperNo);
        if (whisper == null) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "悄悄话不存在");
        }
        if (!Objects.equals(userId, whisper.getSenderUserId())
                && !Objects.equals(userId, whisper.getReceiverUserId())) {
            throw new BusinessException(MESSAGE_FORBIDDEN, "无权查看该悄悄话");
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

    private Long remainingSeconds(LocalDateTime expiresAt, LocalDateTime now) {
        return expiresAt == null ? null : Math.max(0L, Duration.between(now, expiresAt).getSeconds());
    }

    private void requireDirection(String direction) {
        if (!"received".equals(direction) && !"sent".equals(direction)) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "direction仅支持received或sent");
        }
    }

    private int pageSize(int size) {
        return size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
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
