package com.spacetime.common.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.TencentImProperties;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.enums.MessageReliableStatusEnum;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageReadStatusEnum;
import com.spacetime.common.enums.MessageTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.model.message.TencentImCallbackRequest;
import com.spacetime.common.model.message.TencentImCallbackResponse;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.TencentImCallbackService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Set;

/** TIM 回调的协议校验、普通私信最终鉴权与发送结果归档。 */
@Slf4j
@Service
public class TencentImCallbackServiceImpl implements TencentImCallbackService {
    private static final String BEFORE_COMMAND = "C2C.CallbackBeforeSendMsg";
    private static final String AFTER_COMMAND = "C2C.CallbackAfterSendMsg";
    private static final String READ_COMMAND = "C2C.CallbackAfterMsgReport";
    private static final String GLOBAL_SEND_KEY = "global_send_enabled";
    private static final String TIM_CHANNEL = "tencent_im";
    private static final int MAX_BODY_BYTES = 64 * 1024;
    private static final long MAX_REQUEST_TIME_SKEW_SECONDS = 60L;
    private static final int ACCESS_RESTRICTED = 30001;
    private static final int RELATION_FORBIDDEN = 30002;
    private static final int FEMALE_PROTECTION = 30003;
    private static final int CONVERSATION_INVALID = 30004;
    private static final int MESSAGE_SEND_FAILED = 30008;
    private static final int GLOBAL_SEND_DISABLED = 30015;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final Set<String> WHISPER_EVENTS = Set.of("whisper_request", "whisper_reply");

    private final TencentImProperties properties;
    private final ObjectMapper objectMapper;
    private final AppUserImAccountDao accountDao;
    private final AppUserDao userDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final AppRelationMatchDao matchDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageConversationMemberDao memberDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppMessageRuntimeControlDao runtimeControlDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageDeliveryOutboxDao outboxDao;
    private final AppMessageWhisperDao whisperDao;
    private final TransactionOperations transactionOperations;
    private final Clock clock;

    @Autowired
    public TencentImCallbackServiceImpl(
            TencentImProperties properties,
            ObjectMapper objectMapper,
            AppUserImAccountDao accountDao,
            AppUserDao userDao,
            RelationAccessProjectionService accessProjectionService,
            AppRelationMatchDao matchDao,
            AppMessageConversationDao conversationDao,
            AppMessageConversationMemberDao memberDao,
            AppUserRelationBlockDao relationBlockDao,
            AppMessageRuntimeControlDao runtimeControlDao,
            AppMessageRecordDao recordDao,
            AppMessageDeliveryOutboxDao outboxDao,
            AppMessageWhisperDao whisperDao,
            TransactionOperations transactionOperations) {
        this(properties, objectMapper, accountDao, userDao, accessProjectionService, matchDao,
                conversationDao, memberDao, relationBlockDao, runtimeControlDao, recordDao, outboxDao,
                whisperDao, transactionOperations, Clock.systemUTC());
    }

    TencentImCallbackServiceImpl(
            TencentImProperties properties,
            ObjectMapper objectMapper,
            AppUserImAccountDao accountDao,
            AppUserDao userDao,
            RelationAccessProjectionService accessProjectionService,
            AppRelationMatchDao matchDao,
            AppMessageConversationDao conversationDao,
            AppMessageConversationMemberDao memberDao,
            AppUserRelationBlockDao relationBlockDao,
            AppMessageRuntimeControlDao runtimeControlDao,
            AppMessageRecordDao recordDao,
            AppMessageDeliveryOutboxDao outboxDao,
            AppMessageWhisperDao whisperDao,
            TransactionOperations transactionOperations,
            Clock clock) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.accountDao = accountDao;
        this.userDao = userDao;
        this.accessProjectionService = accessProjectionService;
        this.matchDao = matchDao;
        this.conversationDao = conversationDao;
        this.memberDao = memberDao;
        this.relationBlockDao = relationBlockDao;
        this.runtimeControlDao = runtimeControlDao;
        this.recordDao = recordDao;
        this.outboxDao = outboxDao;
        this.whisperDao = whisperDao;
        this.transactionOperations = transactionOperations;
        this.clock = clock;
    }

    @Override
    public TencentImCallbackResponse handle(TencentImCallbackRequest request) {
        final JsonNode body;
        try {
            body = verifyEnvelope(request);
        } catch (CallbackProtocolException ex) {
            return TencentImCallbackResponse.fail(1, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("TIM callback envelope validation failed, command={}", safeCommand(request), ex);
            return TencentImCallbackResponse.fail(1, "callback validation failed");
        }

        if (BEFORE_COMMAND.equals(request.callbackCommand())) {
            try {
                authorizeBeforeSend(request, body);
                return TencentImCallbackResponse.ok();
            } catch (CallbackBusinessException ex) {
                return TencentImCallbackResponse.fail(toTencentBusinessCode(ex.code()),
                        ex.code() + ":" + ex.getMessage());
            } catch (RuntimeException ex) {
                log.warn("TIM before-send callback failed, command={}", request.callbackCommand(), ex);
                return TencentImCallbackResponse.fail(1, "callback processing failed");
            }
        }

        if (READ_COMMAND.equals(request.callbackCommand())) {
            try {
                transactionOperations.execute(status -> {
                    syncReadReport(body, request.requestTime());
                    return null;
                });
                return TencentImCallbackResponse.ok();
            } catch (RuntimeException ex) {
                log.warn("TIM read-report callback failed, command={}",
                        request.callbackCommand(), ex);
                return TencentImCallbackResponse.fail(1, "callback processing failed");
            }
        }

        try {
            transactionOperations.execute(status -> {
                archiveAfterSend(request, body);
                return null;
            });
            return TencentImCallbackResponse.ok();
        } catch (RuntimeException ex) {
            log.warn("TIM after-send callback failed, command={}", request.callbackCommand(), ex);
            return TencentImCallbackResponse.fail(1, "callback processing failed");
        }
    }

    private JsonNode verifyEnvelope(TencentImCallbackRequest request) {
        if (request == null || !properties.isEnabled()
                || properties.getSdkAppId() <= 0
                || isBlank(properties.getCallbackPathToken())
                || isBlank(properties.getCallbackAuthToken())) {
            throw protocol("callback is not configured");
        }
        if (request.sdkAppId() != properties.getSdkAppId()) {
            throw protocol("sdk app id mismatch");
        }
        if (!constantEquals(properties.getCallbackPathToken(), request.callbackPathToken())) {
            throw protocol("callback path token invalid");
        }
        long now = clock.instant().getEpochSecond();
        if (request.requestTime() < now - MAX_REQUEST_TIME_SKEW_SECONDS
                || request.requestTime() > now + MAX_REQUEST_TIME_SKEW_SECONDS) {
            throw protocol("callback request expired");
        }
        String expectedSign = sha256Hex(properties.getCallbackAuthToken() + request.requestTime());
        if (!constantEquals(expectedSign, normalizeHex(request.sign()))) {
            throw protocol("callback signature invalid");
        }
        if (!BEFORE_COMMAND.equals(request.callbackCommand())
                && !AFTER_COMMAND.equals(request.callbackCommand())
                && !READ_COMMAND.equals(request.callbackCommand())) {
            throw protocol("callback command unsupported");
        }
        if (isBlank(request.body())
                || request.body().getBytes(StandardCharsets.UTF_8).length > MAX_BODY_BYTES) {
            throw protocol("callback body invalid");
        }
        try {
            JsonNode body = objectMapper.readTree(request.body());
            if (!body.isObject()
                    || !request.callbackCommand().equals(text(body, "CallbackCommand"))) {
                throw protocol("callback command mismatch");
            }
            return body;
        } catch (JsonProcessingException ex) {
            throw protocol("callback body is not valid json");
        }
    }

    private void authorizeBeforeSend(TencentImCallbackRequest request, JsonNode body) {
        requireGlobalSendEnabled();
        ParticipantPair pair = mapParticipants(body);
        requireOpenAccess(pair);
        requireNotBlocked(pair);
        MessageElement element = messageElement(body);
        if ("TIMTextElem".equals(element.type())) {
            validateText(element.text(), 500);
            AppRelationMatch match = matchDao.selectActivePair(pair.lowId(), pair.highId());
            if (match == null || !RelationMatchStatusEnum.MATCHED.getCode().equals(match.getMatchStatus())) {
                throw business(RELATION_FORBIDDEN, "双方尚未匹配");
            }
            AppMessageConversation conversation = conversationDao.selectActivePair(
                    pair.lowId(), pair.highId());
            if (conversation == null
                    || !MessageConversationStatusEnum.ACTIVE.getCode().equals(conversation.getStatus())
                    || !Objects.equals(match.getId(), conversation.getMatchId())) {
                throw business(CONVERSATION_INVALID, "私信会话已失效");
            }
            if (femaleProtectionBlocks(conversation, pair.senderUserId(), nowLocal())) {
                throw business(FEMALE_PROTECTION, "等待女方先发送消息");
            }
            return;
        }
        if ("TIMCustomElem".equals(element.type())) {
            if (!"RESTAPI".equalsIgnoreCase(request.optPlatform())) {
                throw business(MESSAGE_SEND_FAILED, "悄悄话只允许平台服务端投递");
            }
            requireWhisperCommand(pair, body, element);
            return;
        }
        throw business(MESSAGE_SEND_FAILED, "当前消息类型未开放");
    }

    private void archiveAfterSend(TencentImCallbackRequest request, JsonNode body) {
        ParticipantPair pair = mapParticipants(body);
        MessageElement element = messageElement(body);
        if ("TIMTextElem".equals(element.type())) {
            archiveText(pair, body, element.text(), request.requestTime());
            return;
        }
        if ("TIMCustomElem".equals(element.type())) {
            if (!"RESTAPI".equalsIgnoreCase(request.optPlatform())) {
                throw protocol("custom message sender is not RESTAPI");
            }
            confirmWhisperDelivery(pair, body, element, request.requestTime());
            return;
        }
        throw protocol("callback message type unsupported");
    }

    private void syncReadReport(JsonNode body, long requestTime) {
        String reporterIm = requiredText(body, "Report_Account");
        String peerIm = requiredText(body, "Peer_Account");
        AppUserImAccount reporter = accountDao.selectByImUserId(reporterIm);
        AppUserImAccount peer = accountDao.selectByImUserId(peerIm);
        if (reporter == null || peer == null || reporter.getUserId() == null
                || peer.getUserId() == null
                || Objects.equals(reporter.getUserId(), peer.getUserId())) {
            throw protocol("TIM read-report account mapping invalid");
        }
        Long lowId = Math.min(reporter.getUserId(), peer.getUserId());
        Long highId = Math.max(reporter.getUserId(), peer.getUserId());
        long lastReadEpochSecond = body.path("LastReadTime").asLong(0);
        if (lastReadEpochSecond <= 0) {
            throw protocol("read-report time invalid");
        }
        long eventTimeMillis = body.path("EventTime").asLong(requestTime * 1000L);
        LocalDateTime lastReadTime = LocalDateTime.ofInstant(
                Instant.ofEpochSecond(lastReadEpochSecond), BUSINESS_ZONE);
        LocalDateTime readAt = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(eventTimeMillis), BUSINESS_ZONE);
        AppMessageConversation conversation = conversationDao.selectPairAtMessageTimeForUpdate(
                lowId, highId, lastReadTime);
        if (conversation == null) {
            throw protocol("conversation mapping missing");
        }
        memberDao.advanceReadWatermark(conversation.getId(), reporter.getUserId(),
                lastReadTime, readAt);
        recordDao.markReadThroughTime(conversation.getId(), reporter.getUserId(),
                peer.getUserId(), lastReadTime, readAt);
    }

    private void archiveText(ParticipantPair pair, JsonNode body, String content, long requestTime) {
        validateText(content, 500);
        String timMsgKey = requiredText(body, "MsgKey");
        String timMessageId = requiredText(body, "MsgId");
        LocalDateTime sentAt = callbackTime(body, requestTime);
        AppMessageConversation conversation = conversationDao.selectPairAtMessageTimeForUpdate(
                pair.lowId(), pair.highId(), sentAt);
        if (conversation == null) {
            throw protocol("conversation mapping missing");
        }

        AppMessageRecord existing = recordDao.selectByTimMsgKey(timMsgKey);
        if (existing != null) {
            requireSameTextMapping(existing, pair, conversation, timMessageId, timMsgKey);
            return;
        }

        int sendResult = body.path("SendMsgResult").asInt(0);
        boolean active = MessageConversationStatusEnum.ACTIVE.getCode().equals(
                conversation.getStatus()) && Integer.valueOf(1).equals(conversation.getActiveMarker());
        AppMessageConversationMember receiverMember = sendResult == 0 && active
                ? memberDao.selectByConversationAndUserForUpdate(
                        conversation.getId(), pair.receiverUserId())
                : null;
        if (sendResult == 0 && active && receiverMember == null) {
            throw protocol("conversation receiver member mapping missing");
        }
        boolean coveredByReadWatermark = receiverMember != null
                && receiverMember.getLastReadMessageTime() != null
                && !sentAt.isAfter(receiverMember.getLastReadMessageTime());
        AppMessageRecord record = new AppMessageRecord();
        record.setMessageNo(stableId("TIM-", properties.getSdkAppId() + ":" + timMsgKey));
        record.setClientMsgId(stableId("TC-", pair.senderImUserId() + ":"
                + body.path("MsgSeq").asText() + ":" + body.path("MsgRandom").asText()));
        record.setConversationId(conversation.getId());
        record.setConversationNo(conversation.getConversationNo());
        record.setSenderType("user");
        record.setSenderUserId(pair.senderUserId());
        record.setReceiverUserId(pair.receiverUserId());
        record.setMessageType(MessageTypeEnum.TEXT.getCode());
        record.setContentText(content);
        record.setSendStatus(sendResult == 0
                ? MessageSendStatusEnum.SENT.getCode() : MessageSendStatusEnum.FAILED.getCode());
        record.setReceiverReadStatus(sendResult == 0 && active
                ? (coveredByReadWatermark
                    ? MessageReadStatusEnum.READ.getCode()
                    : MessageReadStatusEnum.UNREAD.getCode())
                : MessageReadStatusEnum.NOT_APPLICABLE.getCode());
        record.setReceiverReadAt(coveredByReadWatermark
                ? Objects.requireNonNullElse(
                        receiverMember.getLastReadAt(), receiverMember.getLastReadMessageTime())
                : null);
        record.setTimMessageId(timMessageId);
        record.setTimMsgKey(timMsgKey);
        record.setProviderSentAt(sentAt);
        record.setSentAt(sendResult == 0 ? sentAt : null);
        record.setSourceBizType("tim_callback");
        record.setSourceBizNo(conversation.getConversationNo());
        record.setFailureCode(sendResult == 0 ? null : "TIM_SEND_" + sendResult);
        record.setFailureReason(sendResult == 0 ? null : "腾讯云TIM发送失败");
        if (!active) {
            record.setIsolatedAt(sentAt);
            record.setPurgeAfter(Objects.requireNonNullElseGet(
                    conversation.getPurgeAfter(), () -> sentAt.plusDays(180)));
        }
        record.setVersion(0);
        try {
            recordDao.insert(record);
        } catch (DuplicateKeyException ex) {
            AppMessageRecord concurrent = recordDao.selectByTimMsgKey(timMsgKey);
            if (concurrent == null) {
                throw ex;
            }
            requireSameTextMapping(concurrent, pair, conversation, timMessageId, timMsgKey);
            return;
        }
        if (record.getId() == null) {
            throw protocol("message archive id missing");
        }
        if (sendResult == 0 && active) {
            boolean femaleFirst = Integer.valueOf(1).equals(conversation.getProtectionEnabled())
                    && Objects.equals(pair.senderUserId(), conversation.getFemaleUserId())
                    && conversation.getFemaleFirstMessageAt() == null;
            if (conversationDao.touchMessage(conversation.getId(), record.getId(), sentAt,
                    femaleFirst) != 1) {
                throw protocol("conversation projection update failed");
            }
        }
    }

    private void confirmWhisperDelivery(ParticipantPair pair, JsonNode body,
                                        MessageElement element, long requestTime) {
        WhisperCallbackContext context = whisperContext(body, element);
        AppMessageRecord record = requireWhisperRecord(pair, context);
        String timMsgKey = requiredText(body, "MsgKey");
        String timMessageId = requiredText(body, "MsgId");
        LocalDateTime sentAt = callbackTime(body, requestTime);
        AppMessageRecord mapped = recordDao.selectByTimMsgKey(timMsgKey);
        if (mapped != null && !Objects.equals(mapped.getId(), record.getId())) {
            throw protocol("TIM message key already belongs to another record");
        }
        if (MessageSendStatusEnum.QUEUED.getCode().equals(record.getSendStatus())) {
            if (recordDao.confirmTimMapping(record.getId(), valueOrZero(record.getVersion()),
                    timMessageId, timMsgKey, sentAt) != 1) {
                AppMessageRecord current = recordDao.selectByMessageNo(context.messageNo());
                requireSameWhisperMapping(current, record, timMessageId, timMsgKey);
            }
        } else {
            requireSameWhisperMapping(record, record, timMessageId, timMsgKey);
        }

        AppMessageDeliveryOutbox outbox = requireWhisperOutbox(record, context.eventType());
        if (outboxDao.confirmCallback(outbox.getId(), timMsgKey, sentAt) != 1) {
            throw protocol("outbox callback confirmation failed");
        }
        if ("whisper_request".equals(context.eventType())) {
            whisperDao.confirmRequestDelivery(record.getId(), sentAt);
        }
    }

    private void requireWhisperCommand(ParticipantPair pair, JsonNode body, MessageElement element) {
        WhisperCallbackContext context = whisperContext(body, element);
        AppMessageRecord record = requireWhisperRecord(pair, context);
        requireWhisperOutbox(record, context.eventType());
    }

    private AppMessageRecord requireWhisperRecord(ParticipantPair pair,
                                                   WhisperCallbackContext context) {
        AppMessageRecord record = recordDao.selectByMessageNo(context.messageNo());
        String expectedType = "whisper_request".equals(context.eventType())
                ? MessageTypeEnum.WHISPER.getCode() : MessageTypeEnum.WHISPER_REPLY.getCode();
        if (record == null
                || !expectedType.equals(record.getMessageType())
                || !Objects.equals(pair.senderUserId(), record.getSenderUserId())
                || !Objects.equals(pair.receiverUserId(), record.getReceiverUserId())
                || !Objects.equals(context.whisperNo(), record.getSourceBizNo())
                || !Objects.equals(context.content(), record.getContentText())) {
            throw protocol("whisper message mapping invalid");
        }
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(context.whisperNo());
        if (whisper == null) {
            throw protocol("whisper business record missing");
        }
        return record;
    }

    private AppMessageDeliveryOutbox requireWhisperOutbox(AppMessageRecord record, String eventType) {
        AppMessageDeliveryOutbox outbox = outboxDao.selectByAggregate("message", record.getId(), TIM_CHANNEL);
        if (outbox == null
                || !eventType.equals(outbox.getEventType())
                || !Objects.equals(record.getSenderUserId(), outbox.getSenderUserId())
                || !Objects.equals(record.getReceiverUserId(), outbox.getReceiverUserId())
                || MessageReliableStatusEnum.DEAD.getCode().equals(outbox.getStatus())
                || payloadContainsBody(outbox.getPayloadJson())) {
            throw protocol("whisper outbox mapping invalid");
        }
        return outbox;
    }

    private WhisperCallbackContext whisperContext(JsonNode body, MessageElement element) {
        JsonNode cloud = embeddedJson(body.path("CloudCustomData"));
        JsonNode custom = element.customData();
        String messageNo = firstText(cloud, custom, "messageNo");
        String eventType = firstText(cloud, custom, "messageType");
        String whisperNo = firstText(cloud, custom, "whisperNo");
        String content = text(custom, "content");
        int protocolVersion = cloud.path("protocolVersion").asInt(
                custom.path("protocolVersion").asInt(-1));
        if (isBlank(messageNo) || !WHISPER_EVENTS.contains(eventType)
                || isBlank(whisperNo) || isBlank(content)
                || protocolVersion != properties.getProtocolVersion()) {
            throw protocol("whisper callback metadata invalid");
        }
        validateText(content, "whisper_request".equals(eventType) ? 60 : 500);
        return new WhisperCallbackContext(messageNo, eventType, whisperNo, content);
    }

    private MessageElement messageElement(JsonNode body) {
        JsonNode elements = body.path("MsgBody");
        if (!elements.isArray() || elements.size() != 1) {
            throw protocol("callback must contain exactly one message element");
        }
        JsonNode element = elements.get(0);
        String type = text(element, "MsgType");
        JsonNode content = element.path("MsgContent");
        if ("TIMTextElem".equals(type)) {
            return new MessageElement(type, text(content, "Text"), null);
        }
        if ("TIMCustomElem".equals(type)) {
            return new MessageElement(type, null, embeddedJson(content.path("Data")));
        }
        return new MessageElement(type, null, null);
    }

    private ParticipantPair mapParticipants(JsonNode body) {
        String senderIm = requiredText(body, "From_Account");
        String receiverIm = requiredText(body, "To_Account");
        AppUserImAccount sender = accountDao.selectByImUserId(senderIm);
        AppUserImAccount receiver = accountDao.selectByImUserId(receiverIm);
        if (sender == null || receiver == null || sender.getUserId() == null
                || receiver.getUserId() == null
                || Objects.equals(sender.getUserId(), receiver.getUserId())) {
            throw protocol("TIM account mapping invalid");
        }
        return new ParticipantPair(sender.getUserId(), receiver.getUserId(), senderIm, receiverIm);
    }

    private void requireOpenAccess(ParticipantPair pair) {
        AppUser sender = userDao.selectById(pair.senderUserId());
        AppUser receiver = userDao.selectById(pair.receiverUserId());
        if (sender == null || receiver == null
                || !"OPEN".equals(accessProjectionService.project(sender))
                || !"OPEN".equals(accessProjectionService.project(receiver))) {
            throw business(ACCESS_RESTRICTED, "双方当前不可使用私信");
        }
    }

    private void requireNotBlocked(ParticipantPair pair) {
        String blacklist = RelationBlockTypeEnum.BLACKLIST.getCode();
        if (relationBlockDao.selectActive(pair.senderUserId(), pair.receiverUserId(), blacklist) != null
                || relationBlockDao.selectActive(pair.receiverUserId(), pair.senderUserId(), blacklist) != null) {
            throw business(RELATION_FORBIDDEN, "双方当前不可发送消息");
        }
    }

    private void requireGlobalSendEnabled() {
        AppMessageRuntimeControl control = runtimeControlDao.selectByControlKey(GLOBAL_SEND_KEY);
        if (control == null || !Integer.valueOf(1).equals(control.getEnabled())) {
            throw business(GLOBAL_SEND_DISABLED, "平台已暂停新消息发送");
        }
    }

    private boolean femaleProtectionBlocks(AppMessageConversation conversation,
                                             Long senderUserId, LocalDateTime now) {
        return Integer.valueOf(1).equals(conversation.getProtectionEnabled())
                && Objects.equals(senderUserId, conversation.getMaleUserId())
                && conversation.getFemaleFirstMessageAt() == null
                && (conversation.getProtectionUntil() == null
                || now.isBefore(conversation.getProtectionUntil()));
    }

    private void requireSameTextMapping(AppMessageRecord record, ParticipantPair pair,
                                        AppMessageConversation conversation,
                                        String timMessageId, String timMsgKey) {
        if (!Objects.equals(pair.senderUserId(), record.getSenderUserId())
                || !Objects.equals(pair.receiverUserId(), record.getReceiverUserId())
                || !Objects.equals(conversation.getId(), record.getConversationId())
                || !Objects.equals(timMessageId, record.getTimMessageId())
                || !Objects.equals(timMsgKey, record.getTimMsgKey())) {
            throw protocol("duplicate TIM mapping conflicts with archived message");
        }
    }

    private void requireSameWhisperMapping(AppMessageRecord current, AppMessageRecord expected,
                                           String timMessageId, String timMsgKey) {
        if (current == null || !Objects.equals(current.getId(), expected.getId())
                || !MessageSendStatusEnum.SENT.getCode().equals(current.getSendStatus())
                || !Objects.equals(timMessageId, current.getTimMessageId())
                || !Objects.equals(timMsgKey, current.getTimMsgKey())) {
            throw protocol("whisper TIM mapping conflicts with message record");
        }
    }

    private LocalDateTime callbackTime(JsonNode body, long requestTime) {
        long epochSecond = body.path("MsgTime").asLong(requestTime);
        if (epochSecond <= 0) {
            epochSecond = requestTime;
        }
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSecond), BUSINESS_ZONE);
    }

    private LocalDateTime nowLocal() {
        return LocalDateTime.ofInstant(clock.instant(), BUSINESS_ZONE);
    }

    private void validateText(String value, int maxCodePoints) {
        String normalized = value == null ? "" : value.trim();
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 1 || length > maxCodePoints) {
            throw business(MESSAGE_SEND_FAILED, "消息内容长度不符合要求");
        }
    }

    private boolean payloadContainsBody(String payloadJson) {
        if (isBlank(payloadJson)) {
            return false;
        }
        try {
            JsonNode payload = objectMapper.readTree(payloadJson);
            return containsBodyField(payload);
        } catch (JsonProcessingException ex) {
            return true;
        }
    }

    private boolean containsBodyField(JsonNode node) {
        if (node == null || node.isValueNode()) {
            return false;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                if (containsBodyField(child)) {
                    return true;
                }
            }
            return false;
        }
        var fields = node.fields();
        while (fields.hasNext()) {
            var field = fields.next();
            String key = field.getKey();
            if ("content".equalsIgnoreCase(key) || "contentText".equalsIgnoreCase(key)
                    || "body".equalsIgnoreCase(key) || "text".equalsIgnoreCase(key)) {
                return true;
            }
            if (containsBodyField(field.getValue())) {
                return true;
            }
        }
        return false;
    }

    private JsonNode embeddedJson(JsonNode value) {
        if (value == null || value.isMissingNode() || value.isNull()) {
            throw protocol("embedded callback metadata missing");
        }
        if (value.isObject()) {
            return value;
        }
        if (!value.isTextual() || value.asText().isBlank()) {
            throw protocol("embedded callback metadata invalid");
        }
        try {
            JsonNode parsed = objectMapper.readTree(value.asText());
            if (!parsed.isObject()) {
                throw protocol("embedded callback metadata invalid");
            }
            return parsed;
        } catch (JsonProcessingException ex) {
            throw protocol("embedded callback metadata invalid");
        }
    }

    private String firstText(JsonNode primary, JsonNode fallback, String field) {
        String value = text(primary, field);
        return isBlank(value) ? text(fallback, field) : value;
    }

    private String requiredText(JsonNode node, String field) {
        String value = text(node, field);
        if (isBlank(value)) {
            throw protocol("callback field missing: " + field);
        }
        return value;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.path(field);
        return value != null && value.isTextual() ? value.asText() : null;
    }

    private String stableId(String prefix, String source) {
        return prefix + sha256Hex(source).substring(0, 32);
    }

    private String sha256Hex(String source) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(source.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private boolean constantEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private String normalizeHex(String value) {
        return value == null ? null : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private int toTencentBusinessCode(int businessCode) {
        return businessCode >= 30001 && businessCode <= 30024
                ? 120000 + (businessCode - 30000) : 1;
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String safeCommand(TencentImCallbackRequest request) {
        return request == null ? null : request.callbackCommand();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private CallbackProtocolException protocol(String message) {
        return new CallbackProtocolException(message);
    }

    private CallbackBusinessException business(int code, String message) {
        return new CallbackBusinessException(code, message);
    }

    private record ParticipantPair(Long senderUserId, Long receiverUserId,
                                   String senderImUserId, String receiverImUserId) {
        private Long lowId() {
            return Math.min(senderUserId, receiverUserId);
        }

        private Long highId() {
            return Math.max(senderUserId, receiverUserId);
        }
    }

    private record MessageElement(String type, String text, JsonNode customData) {
    }

    private record WhisperCallbackContext(String messageNo, String eventType,
                                          String whisperNo, String content) {
    }

    private static final class CallbackProtocolException extends RuntimeException {
        private CallbackProtocolException(String message) {
            super(message);
        }
    }

    private static final class CallbackBusinessException extends RuntimeException {
        private final int code;

        private CallbackBusinessException(int code, String message) {
            super(message);
            this.code = code;
        }

        private int code() {
            return code;
        }
    }
}
