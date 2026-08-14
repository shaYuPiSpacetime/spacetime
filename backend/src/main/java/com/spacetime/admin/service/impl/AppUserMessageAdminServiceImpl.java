package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.AdminConversationVO;
import com.spacetime.admin.dto.response.AdminPlatformMessageVO;
import com.spacetime.admin.dto.response.AdminPrivateMessageVO;
import com.spacetime.admin.dto.response.AdminReportLinkVO;
import com.spacetime.admin.dto.response.AdminSensitiveContentItemVO;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.dto.response.AdminSystemMessageVO;
import com.spacetime.admin.dto.response.AdminWhisperVO;
import com.spacetime.admin.dto.response.UserMessageSummaryVO;
import com.spacetime.admin.service.AppUserMessageAdminService;
import com.spacetime.admin.service.MessageSensitiveAccessAuditService;
import com.spacetime.admin.service.SensitiveAccessAuditCommand;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserMessageAdminQueryDao;
import com.spacetime.common.dao.CommunityReportDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.enums.CommunityReportTargetTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.AppUserPlatformMessageProjection;
import com.spacetime.common.model.message.AppUserPrivateMessageProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/** App 用户消息互动元数据查询与受控正文查看实现。 */
@Service
@RequiredArgsConstructor
public class AppUserMessageAdminServiceImpl implements AppUserMessageAdminService {
    private static final String SENSITIVE_PERMISSION = "message:sensitive-content:view";
    private static final int MESSAGE_PAGE_SIZE = 5;

    private final AppUserDao appUserDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageWhisperDao whisperDao;
    private final AppSystemMessageDao systemMessageDao;
    private final CommunityReportDao reportDao;
    private final AppMessageRecordDao recordDao;
    private final AppUserMessageAdminQueryDao queryDao;
    private final MessageSensitiveAccessAuditService auditService;

    @Override
    public UserMessageSummaryVO summary(Long userId) {
        requireUser(userId);
        LocalDateTime now = LocalDateTime.now();
        long privateUnread = queryDao.countPrivateUnread(userId);
        long whisperUnread = whisperDao.countUnreadPending(userId, now);
        long systemUnread = queryDao.countSystemUnread(userId, now);
        long assistantUnread = queryDao.countAssistantUnread(userId, now);

        UserMessageSummaryVO vo = new UserMessageSummaryVO();
        vo.setConversationCount(conversationPage(userId, null, 1, 1).getTotal());
        vo.setActiveConversationCount(conversationPage(userId, "active", 1, 1).getTotal());
        vo.setPrivateMessageCount(queryDao.countPrivateMessages(userId));
        vo.setPrivateUnreadCount(privateUnread);
        vo.setWhisperCount(whisperPage(userId, null, false, 1, 1).getTotal());
        vo.setPendingWhisperCount(whisperPage(userId, "pending", true, 1, 1).getTotal());
        vo.setWhisperUnreadCount(whisperUnread);
        vo.setSystemMessageCount(systemPage(userId, false, 1, 1).getTotal());
        vo.setUnreadSystemMessageCount(systemUnread);
        vo.setAssistantUnreadCount(assistantUnread);
        vo.setPlatformMessageCount(queryDao.countPlatformMessages(userId));
        vo.setPlatformUnreadCount(whisperUnread + systemUnread + assistantUnread);
        vo.setMessageUnreadCount(privateUnread + whisperUnread + systemUnread + assistantUnread);
        vo.setReportCount(reportPage(userId, 1, 1).getTotal());
        return vo;
    }

    @Override
    public Page<AdminPrivateMessageVO> privateMessages(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = fixedMessagePage(req);
        int offset = (safe.getPage() - 1) * safe.getSize();
        List<AppUserPrivateMessageProjection> projections = queryDao
                .selectPrivateMessages(userId, offset, safe.getSize());
        Map<Long, AppUser> peerUsers = usersByIds(projections.stream()
                .map(value -> peerUserId(userId, value.getSenderUserId(), value.getReceiverUserId()))
                .toList());
        List<AdminPrivateMessageVO> records = projections.stream()
                .map(value -> toPrivateMessageVO(userId, value, peerUsers))
                .toList();
        Page<AdminPrivateMessageVO> result = new Page<>(safe.getPage(), safe.getSize(),
                queryDao.countPrivateMessages(userId));
        result.setRecords(records);
        return result;
    }

    @Override
    public Page<AdminConversationVO> conversations(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = safe(req);
        Page<AppMessageConversation> page = conversationPage(userId, null, safe.getPage(), safe.getSize());
        Page<AdminConversationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(value -> toConversationVO(userId, value)).toList());
        return result;
    }

    @Override
    public Page<AdminWhisperVO> whispers(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = fixedMessagePage(req);
        Page<AppMessageWhisper> page = whisperPage(userId, null, false, safe.getPage(), safe.getSize());
        List<Long> messageIds = page.getRecords().stream()
                .flatMap(value -> java.util.stream.Stream.of(
                        value.getRequestMessageId(), value.getReplyMessageId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, AppMessageRecord> messages = new LinkedHashMap<>();
        recordDao.selectByIds(messageIds).forEach(value -> messages.put(value.getId(), value));
        Map<Long, AppUser> peerUsers = usersByIds(page.getRecords().stream()
                .map(value -> peerUserId(userId, value.getSenderUserId(), value.getReceiverUserId()))
                .toList());
        Page<AdminWhisperVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(value -> toWhisperVO(userId, value, messages, peerUsers)).toList());
        return result;
    }

    @Override
    public Page<AdminPlatformMessageVO> platformMessages(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = fixedMessagePage(req);
        int offset = (safe.getPage() - 1) * safe.getSize();
        Page<AdminPlatformMessageVO> result = new Page<>(safe.getPage(), safe.getSize(),
                queryDao.countPlatformMessages(userId));
        result.setRecords(queryDao.selectPlatformMessages(userId, offset, safe.getSize()).stream()
                .map(this::toPlatformMessageVO).toList());
        return result;
    }

    @Override
    public Page<AdminSystemMessageVO> systemMessages(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = safe(req);
        Page<AppSystemMessage> page = systemPage(userId, false, safe.getPage(), safe.getSize());
        Page<AdminSystemMessageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toSystemMessageVO).toList());
        return result;
    }

    @Override
    public Page<AdminReportLinkVO> reports(Long userId, PageReq req) {
        requireUser(userId);
        PageReq safe = fixedMessagePage(req);
        Page<CommunityReport> page = reportPage(userId, safe.getPage(), safe.getSize());
        Page<AdminReportLinkVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(value -> toReportVO(userId, value)).toList());
        return result;
    }

    @Override
    public AdminSensitiveMessageContentVO viewPrivateMessageContent(
            Long userId, String messageNo, SensitiveContentViewReq req) {
        requireUser(userId);
        requireSensitivePermission();
        String reason = requireSensitiveRequest(req);
        SensitiveAccessAuditCommand command = new SensitiveAccessAuditCommand(
                "app_user_message", String.valueOf(userId), "private_message", messageNo,
                reason, req.getRequestId());
        return auditedSensitiveRead(command, accessNo -> {
            AppMessageRecord message = recordDao.selectByMessageNo(messageNo);
            if (message == null || (!Objects.equals(userId, message.getSenderUserId())
                    && !Objects.equals(userId, message.getReceiverUserId()))) {
                throw new BusinessException(30022, "私信消息不存在或不属于当前用户");
            }
            AdminSensitiveContentItemVO item = contentItem("message", message);
            if (item == null) {
                throw new BusinessException(30022, "消息正文已清理或不可用");
            }
            return new AdminSensitiveMessageContentVO(
                    accessNo, "private_message", messageNo, List.of(item));
        });
    }

    @Override
    public AdminSensitiveMessageContentVO viewWhisperContent(
            Long userId, String whisperNo, SensitiveContentViewReq req) {
        requireUser(userId);
        requireSensitivePermission();
        String reason = requireSensitiveRequest(req);
        SensitiveAccessAuditCommand command = new SensitiveAccessAuditCommand(
                "app_user_message", String.valueOf(userId), "whisper", whisperNo,
                reason, req.getRequestId());
        return auditedSensitiveRead(command, accessNo -> {
            AppMessageWhisper whisper = whisperDao.selectByWhisperNo(whisperNo);
            if (whisper == null || (!Objects.equals(userId, whisper.getSenderUserId())
                    && !Objects.equals(userId, whisper.getReceiverUserId()))) {
                throw new BusinessException(30022, "悄悄话不存在或不属于当前用户");
            }
            Map<Long, AppMessageRecord> messages = new LinkedHashMap<>();
            recordDao.selectByIds(java.util.stream.Stream.of(
                            whisper.getRequestMessageId(), whisper.getReplyMessageId())
                            .filter(Objects::nonNull).toList())
                    .forEach(value -> messages.put(value.getId(), value));
            List<AdminSensitiveContentItemVO> items = new ArrayList<>();
            addContent(items, "request", messages.get(whisper.getRequestMessageId()));
            addContent(items, "reply", messages.get(whisper.getReplyMessageId()));
            if (items.isEmpty()) {
                throw new BusinessException(30022, "悄悄话正文已清理或不可用");
            }
            return new AdminSensitiveMessageContentVO(accessNo, "whisper", whisperNo, items);
        });
    }

    private Page<AppMessageConversation> conversationPage(Long userId, String status, int page, int size) {
        LambdaQueryWrapper<AppMessageConversation> wrapper = new LambdaQueryWrapper<>();
        wrapper.and(value -> value.eq(AppMessageConversation::getUserLowId, userId)
                .or().eq(AppMessageConversation::getUserHighId, userId));
        wrapper.eq(status != null, AppMessageConversation::getStatus, status);
        wrapper.orderByDesc(AppMessageConversation::getLastMessageTime)
                .orderByDesc(AppMessageConversation::getCreateTime);
        return conversationDao.selectPage(new Page<>(page, size), wrapper);
    }

    private Page<AppMessageWhisper> whisperPage(
            Long userId, String status, boolean receivedOnly, int page, int size) {
        LambdaQueryWrapper<AppMessageWhisper> wrapper = new LambdaQueryWrapper<>();
        if (receivedOnly) {
            wrapper.eq(AppMessageWhisper::getReceiverUserId, userId);
        } else {
            wrapper.and(value -> value.eq(AppMessageWhisper::getSenderUserId, userId)
                    .or().eq(AppMessageWhisper::getReceiverUserId, userId));
        }
        wrapper.eq(status != null, AppMessageWhisper::getStatus, status);
        wrapper.orderByDesc(AppMessageWhisper::getCreateTime);
        return whisperDao.selectPage(new Page<>(page, size), wrapper);
    }

    private Page<AppSystemMessage> systemPage(Long userId, boolean unreadOnly, int page, int size) {
        LambdaQueryWrapper<AppSystemMessage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AppSystemMessage::getReceiverUserId, userId);
        wrapper.isNull(unreadOnly, AppSystemMessage::getReadAt);
        wrapper.orderByDesc(AppSystemMessage::getCreateTime);
        return systemMessageDao.selectPage(new Page<>(page, size), wrapper);
    }

    private Page<CommunityReport> reportPage(Long userId, int page, int size) {
        LambdaQueryWrapper<CommunityReport> wrapper = new LambdaQueryWrapper<>();
        wrapper.and(value -> value.eq(CommunityReport::getReporterId, userId)
                .or().eq(CommunityReport::getTargetUserId, userId)
                .or().eq(CommunityReport::getReportedUserId, userId));
        wrapper.and(value -> value.in(CommunityReport::getTargetType,
                        CommunityReportTargetTypeEnum.CHAT.getCode(),
                        CommunityReportTargetTypeEnum.MESSAGE.getCode(),
                        CommunityReportTargetTypeEnum.CONVERSATION.getCode(),
                        CommunityReportTargetTypeEnum.WHISPER.getCode())
                .or().in(CommunityReport::getSourceScene, "chat", "whisper"));
        wrapper.orderByDesc(CommunityReport::getCreateTime);
        return reportDao.selectPage(new Page<>(page, size), wrapper);
    }

    private AdminPrivateMessageVO toPrivateMessageVO(
            Long userId, AppUserPrivateMessageProjection value, Map<Long, AppUser> peerUsers) {
        boolean sent = Objects.equals(userId, value.getSenderUserId());
        Long peerUserId = peerUserId(userId, value.getSenderUserId(), value.getReceiverUserId());
        AppUser peerUser = peerUsers.get(peerUserId);
        AdminPrivateMessageVO vo = new AdminPrivateMessageVO();
        vo.setMessageNo(value.getMessageNo());
        vo.setDirection(sent ? "sent" : "received");
        vo.setPeerUserId(peerUserId);
        vo.setPeerNickname(peerUser == null ? null : peerUser.getNickname());
        vo.setPeerMask(mask(peerUserId));
        vo.setMessageType(value.getMessageType());
        vo.setConversationNo(value.getConversationNo());
        vo.setSendStatus(value.getSendStatus());
        vo.setReceiverReadStatus(value.getReceiverReadStatus());
        vo.setReceiverReadAt(value.getReceiverReadAt());
        vo.setFailureCode(value.getFailureCode());
        vo.setFailureReason(value.getFailureReason());
        vo.setBusinessTime(value.getBusinessTime());
        vo.setContentAvailable(Boolean.TRUE.equals(value.getContentAvailable()));
        return vo;
    }

    private AdminConversationVO toConversationVO(Long userId, AppMessageConversation value) {
        AdminConversationVO vo = new AdminConversationVO();
        vo.setConversationNo(value.getConversationNo());
        vo.setTimConversationId(value.getTimConversationId());
        vo.setMatchNo(value.getMatchNo());
        vo.setPeerMask(mask(Objects.equals(userId, value.getUserLowId())
                ? value.getUserHighId() : value.getUserLowId()));
        vo.setStatus(value.getStatus());
        vo.setProtectionEnabled(Integer.valueOf(1).equals(value.getProtectionEnabled()));
        vo.setProtectionUntil(value.getProtectionUntil());
        vo.setFemaleFirstMessageAt(value.getFemaleFirstMessageAt());
        vo.setLastBusinessActivityTime(value.getLastMessageTime());
        vo.setInvalidReason(value.getInvalidReason());
        vo.setInvalidTime(value.getInvalidTime());
        vo.setCreateTime(value.getCreateTime());
        return vo;
    }

    private AdminWhisperVO toWhisperVO(
            Long userId, AppMessageWhisper value, Map<Long, AppMessageRecord> messages,
            Map<Long, AppUser> peerUsers) {
        boolean sent = Objects.equals(userId, value.getSenderUserId());
        Long peerUserId = peerUserId(userId, value.getSenderUserId(), value.getReceiverUserId());
        AppUser peerUser = peerUsers.get(peerUserId);
        AppMessageRecord request = messages.get(value.getRequestMessageId());
        AppMessageRecord reply = messages.get(value.getReplyMessageId());
        AdminWhisperVO vo = new AdminWhisperVO();
        vo.setWhisperNo(value.getWhisperNo());
        vo.setDirection(sent ? "sent" : "received");
        vo.setPeerUserId(peerUserId);
        vo.setPeerNickname(peerUser == null ? null : peerUser.getNickname());
        vo.setPeerMask(mask(peerUserId));
        vo.setStatus(value.getStatus());
        vo.setPayType(value.getPayType());
        vo.setPaymentStatus(value.getPaymentStatus());
        vo.setCoinAmount(value.getCoinAmount());
        vo.setDeliveryStatus(value.getDeliveryStatus());
        vo.setSourceScene(value.getSourceScene());
        vo.setSourceBizNo(value.getSourceBizNo());
        vo.setReceiverHidden(value.getReceiverHiddenAt() != null);
        vo.setReceiverHiddenAt(value.getReceiverHiddenAt());
        vo.setReceiverHideType(value.getReceiverHideType());
        vo.setExpiresAt(value.getExpiresAt());
        vo.setRepliedAt(value.getRepliedAt());
        vo.setInvalidReason(value.getInvalidReason());
        vo.setInvalidTime(value.getInvalidTime());
        vo.setMatchNo(value.getMatchNo());
        vo.setConversationNo(value.getConversationNo());
        vo.setRequestMessageNo(request == null ? null : request.getMessageNo());
        vo.setReplyMessageNo(reply == null ? null : reply.getMessageNo());
        vo.setFailureReason(request == null ? null : request.getFailureReason());
        vo.setContentAvailable(contentAvailable(request) || contentAvailable(reply));
        vo.setCreateTime(value.getCreateTime());
        return vo;
    }

    private AdminPlatformMessageVO toPlatformMessageVO(AppUserPlatformMessageProjection value) {
        AdminPlatformMessageVO vo = new AdminPlatformMessageVO();
        vo.setRecordNo(value.getRecordNo());
        vo.setChannel(value.getChannel());
        vo.setCategory(value.getCategory());
        vo.setBizType(value.getBizType());
        vo.setBizNo(value.getBizNo());
        vo.setReadStatus(value.getReadStatus());
        vo.setActionType(value.getActionType());
        vo.setVisibleUntil(value.getVisibleUntil());
        vo.setBusinessTime(value.getBusinessTime());
        return vo;
    }

    private AdminSystemMessageVO toSystemMessageVO(AppSystemMessage value) {
        AdminSystemMessageVO vo = new AdminSystemMessageVO();
        vo.setNoticeNo(value.getNoticeNo());
        vo.setNotificationType(value.getNotificationType());
        vo.setBizType(value.getBizType());
        vo.setBizNo(value.getBizNo());
        vo.setTemplateCode(value.getTemplateCode());
        vo.setTemplateVersion(value.getTemplateVersion());
        vo.setReadStatus(value.getReadAt() == null ? "unread" : "read");
        vo.setJumpType(value.getJumpType());
        vo.setSafetyRequired(Integer.valueOf(1).equals(value.getSafetyRequired()));
        vo.setVisibleUntil(value.getVisibleUntil());
        vo.setCreateTime(value.getCreateTime());
        return vo;
    }

    private AdminReportLinkVO toReportVO(Long userId, CommunityReport value) {
        AdminReportLinkVO vo = new AdminReportLinkVO();
        vo.setReportNo(value.getReportNo());
        vo.setDirection(Objects.equals(userId, value.getReporterId()) ? "submitted" : "reported");
        vo.setTargetType(value.getTargetType());
        vo.setTargetBizNo(value.getTargetBizNo());
        vo.setSourceScene(value.getSourceScene());
        vo.setReasonCode(value.getReasonCode());
        vo.setStatus(value.getStatus());
        vo.setSnapshotStatus(value.getSnapshotStatus());
        vo.setCreateTime(value.getCreateTime());
        return vo;
    }

    private void addContent(List<AdminSensitiveContentItemVO> items, String role,
                            AppMessageRecord message) {
        AdminSensitiveContentItemVO item = contentItem(role, message);
        if (item != null) items.add(item);
    }

    private AdminSensitiveContentItemVO contentItem(String role, AppMessageRecord message) {
        if (!contentAvailable(message)) return null;
        LocalDateTime eventTime = message.getSentAt() != null ? message.getSentAt()
                : message.getProviderSentAt() != null ? message.getProviderSentAt()
                : message.getCreateTime();
        return new AdminSensitiveContentItemVO(role, message.getMessageNo(),
                message.getMessageType(), message.getContentText(), eventTime);
    }

    private boolean contentAvailable(AppMessageRecord message) {
        return message != null && message.getContentClearedAt() == null
                && StringUtils.hasText(message.getContentText());
    }

    private <T> T auditedSensitiveRead(
            SensitiveAccessAuditCommand command, Function<String, T> reader) {
        String accessNo = auditService.begin(command);
        T result;
        try {
            result = reader.apply(accessNo);
        } catch (BusinessException ex) {
            auditService.complete(accessNo, "denied", "business_" + ex.getCode());
            throw ex;
        } catch (RuntimeException ex) {
            auditService.complete(accessNo, "error", "read_failed");
            throw ex;
        }
        auditService.complete(accessNo, "allowed", null);
        return result;
    }

    private String requireSensitiveRequest(SensitiveContentViewReq req) {
        String reason = req == null ? null : req.getViewReason();
        if (!StringUtils.hasText(reason) || reason.trim().length() < 5 || reason.trim().length() > 100
                || !StringUtils.hasText(req.getRequestId())) {
            throw new BusinessException(4001, "查看原因或请求编号不符合要求");
        }
        return reason.trim();
    }

    private void requireSensitivePermission() {
        UserContext context = UserContextHolder.get();
        boolean superAdmin = context != null && context.getRoles() != null
                && context.getRoles().stream().anyMatch("super_admin"::equalsIgnoreCase);
        boolean granted = context != null && context.getPermissions() != null
                && (context.getPermissions().contains(SENSITIVE_PERMISSION)
                || context.getPermissions().contains("*")
                || context.getPermissions().contains("*:*:*"));
        if (!superAdmin && !granted) {
            throw new ForbiddenException("无权查看高敏消息正文");
        }
    }

    private void requireUser(Long userId) {
        if (userId == null || appUserDao.selectById(userId) == null) {
            throw new BusinessException(30022, "App用户不存在");
        }
    }

    private PageReq safe(PageReq req) {
        return req == null ? new PageReq() : req;
    }

    private PageReq fixedMessagePage(PageReq req) {
        PageReq fixed = new PageReq();
        fixed.setPage(req == null ? 1 : req.getPage());
        fixed.setSize(MESSAGE_PAGE_SIZE);
        return fixed;
    }

    private Long peerUserId(Long currentUserId, Long senderUserId, Long receiverUserId) {
        return Objects.equals(currentUserId, senderUserId) ? receiverUserId : senderUserId;
    }

    private Map<Long, AppUser> usersByIds(List<Long> userIds) {
        List<Long> distinctIds = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) return Map.of();
        Map<Long, AppUser> users = new LinkedHashMap<>();
        appUserDao.selectByIds(distinctIds).forEach(user -> users.put(user.getId(), user));
        return users;
    }

    private String mask(Long userId) {
        if (userId == null) return null;
        String value = String.format(Locale.ROOT, "%012d", userId);
        return "USR-********" + value.substring(value.length() - 4);
    }
}
