package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.AdminSensitiveContentItemVO;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.MessageRecordStatsVO;
import com.spacetime.admin.service.MessageRecordAdminService;
import com.spacetime.admin.service.MessageSensitiveAccessAuditService;
import com.spacetime.admin.service.SensitiveAccessAuditCommand;
import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.MessageAdminQueryDao;
import com.spacetime.common.entity.AppUserExportTask;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.model.message.MessageAdminRecordFilter;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.model.message.MessageAdminRecordStatsProjection;
import com.spacetime.common.provider.SensitiveTextCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Locale;
import java.util.UUID;

/** 消息记录只读元数据查询实现。 */
@Service
@RequiredArgsConstructor
public class MessageRecordAdminServiceImpl implements MessageRecordAdminService {
    private static final int EXPORT_LIMIT = 10_000;
    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final MessageAdminQueryDao queryDao;
    private final AppUserExportTaskDao exportTaskDao;
    private final AppUserDao appUserDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageWhisperDao whisperDao;
    private final AppSystemMessageDao systemMessageDao;
    private final AppAssistantMessageDao assistantMessageDao;
    private final MessageSensitiveAccessAuditService auditService;
    private final SensitiveTextCipher sensitiveTextCipher;

    @Override
    public MessageRecordStatsVO stats() {
        MessageAdminRecordStatsProjection value = queryDao.stats();
        MessageRecordStatsVO vo = new MessageRecordStatsVO();
        if (value == null) {
            vo.setTodayPrivateMessageCount(0L);
            vo.setWaitingWhisperCount(0L);
            vo.setSystemMessageCount(0L);
            vo.setCaseLinkedCount(0L);
            return vo;
        }
        vo.setTodayPrivateMessageCount(zero(value.getTodayPrivateMessageCount()));
        vo.setWaitingWhisperCount(zero(value.getWaitingWhisperCount()));
        vo.setSystemMessageCount(zero(value.getSystemMessageCount()));
        vo.setCaseLinkedCount(zero(value.getCaseLinkedCount()));
        return vo;
    }

    @Override
    public Page<AdminMessageRecordVO> records(MessageRecordPageReq req) {
        MessageRecordPageReq safe = req == null ? new MessageRecordPageReq() : req;
        MessageAdminRecordFilter filter = filter(safe);
        long total = queryDao.count(filter);
        int offset = (safe.getPage() - 1) * safe.getSize();
        List<MessageAdminRecordProjection> values = queryDao.selectPage(filter, offset, safe.getSize());
        Map<Long, AppUser> users = loadUsers(values);
        List<AdminMessageRecordVO> records = values.stream()
                .map(value -> toListVO(value, users)).toList();
        Page<AdminMessageRecordVO> page = new Page<>(safe.getPage(), safe.getSize(), total);
        page.setRecords(records);
        return page;
    }

    @Override
    public AdminMessageRecordDetailVO detail(String recordNo) {
        if (!StringUtils.hasText(recordNo)) throw new BusinessException(4001, "消息记录编号不能为空");
        MessageAdminRecordProjection value = queryDao.selectByRecordNo(recordNo.trim());
        if (value == null) throw new BusinessException(30022, "消息记录不存在");
        Map<Long, AppUser> users = loadUsers(List.of(value));
        AdminMessageRecordDetailVO vo = toDetailVO(value, users);
        enrichContent(vo, value);
        return vo;
    }

    @Override
    public AdminSensitiveMessageContentVO viewContent(String recordNo, SensitiveContentViewReq req) {
        requireSensitivePermission();
        if (!StringUtils.hasText(recordNo)) throw new BusinessException(4001, "消息记录编号不能为空");
        String reason = requireSensitiveRequest(req);
        MessageAdminRecordProjection projection = queryDao.selectByRecordNo(recordNo.trim());
        if (projection == null || !("private_message".equals(projection.getRecordType())
                || "whisper_message".equals(projection.getRecordType()))) {
            throw new BusinessException(30022, "消息记录不存在或不支持高敏查看");
        }
        String targetNo = "whisper_message".equals(projection.getRecordType())
                && StringUtils.hasText(projection.getSourceBizNo())
                ? projection.getSourceBizNo() : projection.getRecordNo();
        SensitiveAccessAuditCommand command = new SensitiveAccessAuditCommand(
                "message_record", projection.getRecordNo(), projection.getRecordType(),
                targetNo, reason, req.getRequestId());
        String accessNo = auditService.begin(command);
        try {
            AdminSensitiveMessageContentVO result = "whisper_message".equals(projection.getRecordType())
                    ? whisperContent(accessNo, targetNo)
                    : privateContent(accessNo, projection.getRecordNo());
            auditService.complete(accessNo, "allowed", null);
            return result;
        } catch (BusinessException ex) {
            auditService.complete(accessNo, "denied", "business_" + ex.getCode());
            throw ex;
        } catch (RuntimeException ex) {
            auditService.complete(accessNo, "error", "read_failed");
            throw ex;
        }
    }

    @Override
    @Transactional
    public ExportTaskVO export(MessageRecordExportReq req) {
        if (req == null || !req.isConfirmNoContent()) {
            throw new BusinessException(4001, "必须确认导出文件不包含消息正文");
        }
        List<MessageAdminRecordProjection> values = queryDao.selectPage(filter(req), 0, EXPORT_LIMIT + 1);
        if (values.size() > EXPORT_LIMIT) {
            throw new BusinessException(4001, "单次最多导出10000条，请缩小筛选范围");
        }
        LocalDateTime now = LocalDateTime.now();
        String taskNo = "MSG-EXPORT-" + now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        String csv = buildCsv(values, loadUsers(values));
        String summary = filterSummary(req);
        AppUserExportTask task = new AppUserExportTask();
        task.setTaskNo(taskNo);
        task.setExportType("MESSAGE_RECORDS");
        task.setStatus("CREATED");
        task.setMessage("消息记录导出文件已生成，固定字段不包含任何消息正文、密文或内容摘要");
        task.setFilterSummary(summary);
        task.setFileName("message-records-" + now.format(FILE_TIME) + ".csv");
        task.setRowCount(values.size());
        task.setDownloadContent(csv);
        task.setOperatorId(UserContextHolder.get() == null ? null : UserContextHolder.get().getId());
        task.setCreateTime(now);
        exportTaskDao.insert(task);
        return toExportVO(task);
    }

    private MessageAdminRecordFilter filter(MessageRecordPageReq req) {
        MessageRecordPageReq safe = req == null ? new MessageRecordPageReq() : req;
        if (safe.getStartTime() != null && safe.getEndTime() != null
                && safe.getStartTime().isAfter(safe.getEndTime())) {
            throw new BusinessException(4001, "开始时间不能晚于结束时间");
        }
        MessageAdminRecordFilter filter = new MessageAdminRecordFilter();
        filter.setKeyword(trim(safe.getKeyword()));
        filter.setRecordType(trim(safe.getRecordType()));
        filter.setMessageType(trim(safe.getMessageType()));
        filter.setSystemCategory(trim(safe.getSystemCategory()));
        filter.setStatus(trim(safe.getStatus()));
        filter.setStartTime(safe.getStartTime());
        filter.setEndTime(safe.getEndTime());
        return filter;
    }

    private AdminMessageRecordVO toListVO(MessageAdminRecordProjection value, Map<Long, AppUser> users) {
        AdminMessageRecordVO vo = new AdminMessageRecordVO();
        vo.setRecordNo(value.getRecordNo());
        vo.setRecordType(value.getRecordType());
        vo.setUserId(value.getUserId());
        vo.setUserNickname(nickname(users.get(value.getUserId())));
        vo.setPeerUserId(value.getPeerUserId());
        vo.setPeerNickname(nickname(users.get(value.getPeerUserId())));
        vo.setMessageType(value.getMessageType());
        vo.setSystemCategory(value.getSystemCategory());
        vo.setStatus(value.getStatus());
        vo.setCreatedTime(value.getBusinessTime());
        vo.setCaseCount(zero(value.getCaseCount()));
        return vo;
    }

    private AdminMessageRecordDetailVO toDetailVO(MessageAdminRecordProjection value,
                                                   Map<Long, AppUser> users) {
        AdminMessageRecordDetailVO vo = new AdminMessageRecordDetailVO();
        vo.setRecordNo(value.getRecordNo());
        vo.setRecordType(value.getRecordType());
        vo.setUserId(value.getUserId());
        vo.setUserNickname(nickname(users.get(value.getUserId())));
        vo.setPeerUserId(value.getPeerUserId());
        vo.setPeerNickname(nickname(users.get(value.getPeerUserId())));
        vo.setMessageType(value.getMessageType());
        vo.setSystemCategory(value.getSystemCategory());
        vo.setStatus(value.getStatus());
        vo.setCreatedTime(value.getBusinessTime());
        vo.setConversationNo(value.getConversationNo());
        vo.setSourceBizNo(value.getSourceBizNo());
        vo.setTimMessageId(value.getTimMessageId());
        vo.setTimMsgKey(value.getTimMsgKey());
        vo.setFailureCode(value.getFailureCode());
        vo.setFailureReason(value.getFailureReason());
        vo.setContentClearedAt(value.getContentClearedAt());
        vo.setCaseCount(zero(value.getCaseCount()));
        return vo;
    }

    private String buildCsv(List<MessageAdminRecordProjection> values, Map<Long, AppUser> users) {
        StringBuilder csv = new StringBuilder("\uFEFF记录编号,记录类型,用户编号,用户昵称,对方用户编号,对方用户昵称,消息类型,系统消息分类,状态,业务时间,会话编号,来源业务编号,TIM消息编号,TIM消息键,失败代码,失败原因,正文清理时间,关联举报数\r\n");
        for (MessageAdminRecordProjection value : values) {
            csv.append(row(value, users)).append("\r\n");
        }
        return csv.toString();
    }

    private String row(MessageAdminRecordProjection value, Map<Long, AppUser> users) {
        return String.join(",",
                csv(value.getRecordNo()), csv(recordTypeLabel(value.getRecordType())), csv(value.getUserId()),
                csv(nickname(users.get(value.getUserId()))), csv(value.getPeerUserId()),
                csv(nickname(users.get(value.getPeerUserId()))), csv(messageTypeLabel(value.getMessageType())),
                csv(systemCategoryLabel(value.getSystemCategory())), csv(statusLabel(value.getStatus())), csv(value.getBusinessTime()),
                csv(value.getConversationNo()), csv(value.getSourceBizNo()), csv(value.getTimMessageId()),
                csv(value.getTimMsgKey()), csv(value.getFailureCode()), csv(value.getFailureReason()),
                csv(value.getContentClearedAt()), csv(zero(value.getCaseCount())));
    }

    private String csv(Object value) {
        if (value == null) return "";
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
    }

    private String recordTypeLabel(String value) {
        return switch (Objects.toString(value, "")) {
            case "private_message" -> "私信";
            case "whisper_message" -> "悄悄话";
            case "system_message" -> "系统消息";
            case "assistant_message" -> "官方助手";
            default -> value;
        };
    }

    private String messageTypeLabel(String value) {
        return switch (Objects.toString(value, "")) {
            case "text" -> "文本";
            case "whisper" -> "悄悄话";
            case "whisper_reply" -> "悄悄话回复";
            case "system" -> "系统消息";
            case "system_tip" -> "系统提示";
            case "assistant" -> "官方助手";
            default -> value;
        };
    }

    private String systemCategoryLabel(String value) {
        return switch (Objects.toString(value, "")) {
            case "governance" -> "治理";
            case "asset" -> "资产";
            case "invite" -> "邀请";
            case "community" -> "社区运营";
            case "platform" -> "平台与安全";
            case "assistant" -> "官方助手";
            default -> value;
        };
    }

    private String statusLabel(String value) {
        return switch (Objects.toString(value, "")) {
            case "sent" -> "已发送";
            case "queued" -> "待发送";
            case "pending" -> "等待回应";
            case "replied" -> "已回应";
            case "expired" -> "已过期";
            case "invalid" -> "已失效";
            case "unread" -> "未读";
            case "read" -> "已读";
            case "failed" -> "失败";
            default -> value;
        };
    }

    private String filterSummary(MessageRecordPageReq req) {
        return "keyword=" + empty(req.getKeyword()) + ";recordType=" + empty(req.getRecordType())
                + ";messageType=" + empty(req.getMessageType()) + ";systemCategory="
                + empty(req.getSystemCategory()) + ";status=" + empty(req.getStatus())
                + ";startTime=" + empty(req.getStartTime()) + ";endTime=" + empty(req.getEndTime());
    }

    private ExportTaskVO toExportVO(AppUserExportTask task) {
        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo(task.getTaskNo());
        vo.setExportType(task.getExportType());
        vo.setStatus(task.getStatus());
        vo.setMessage(task.getMessage());
        vo.setFilterSummary(task.getFilterSummary());
        vo.setFileName(task.getFileName());
        vo.setRowCount(task.getRowCount());
        vo.setDownloadContent(task.getDownloadContent());
        vo.setCreateTime(task.getCreateTime());
        return vo;
    }

    private Map<Long, AppUser> loadUsers(List<MessageAdminRecordProjection> values) {
        List<Long> ids = values.stream().flatMap(value -> java.util.stream.Stream.of(
                        value.getUserId(), value.getPeerUserId()))
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, AppUser> result = new LinkedHashMap<>();
        appUserDao.selectByIds(ids).forEach(user -> result.put(user.getId(), user));
        return result;
    }

    private String nickname(AppUser user) {
        return user == null ? null : user.getNickname();
    }

    private void enrichContent(AdminMessageRecordDetailVO vo, MessageAdminRecordProjection value) {
        if ("private_message".equals(value.getRecordType())) {
            AppMessageRecord message = recordDao.selectByMessageNo(value.getRecordNo());
            vo.setContentAvailable(contentAvailable(message));
            vo.setSensitiveContent(true);
            return;
        }
        if ("whisper_message".equals(value.getRecordType())) {
            AppMessageWhisper whisper = StringUtils.hasText(value.getSourceBizNo())
                    ? whisperDao.selectByWhisperNo(value.getSourceBizNo()) : null;
            boolean available = false;
            if (whisper != null) {
                for (AppMessageRecord message : recordDao.selectByIds(java.util.stream.Stream.of(
                                whisper.getRequestMessageId(), whisper.getReplyMessageId())
                        .filter(Objects::nonNull).toList())) {
                    available = available || contentAvailable(message);
                }
            } else {
                available = contentAvailable(recordDao.selectByMessageNo(value.getRecordNo()));
            }
            vo.setContentAvailable(available);
            vo.setSensitiveContent(true);
            return;
        }
        vo.setSensitiveContent(false);
        if ("system_message".equals(value.getRecordType())) {
            AppSystemMessage message = systemMessageDao.selectByNoticeNo(value.getRecordNo());
            if (message != null) {
                vo.setTitle(plainOrDecrypt(message.getTitleText(), message.getTitleCiphertext(), message.getTitleIv(), message.getTitleKeyVersion(), message.getTitleHmac()));
                vo.setContent(plainOrDecrypt(message.getContentText(), message.getContentCiphertext(), message.getContentIv(), message.getContentKeyVersion(), message.getContentHmac()));
                vo.setContentFormat(message.getContentFormat());
            }
        } else if ("assistant_message".equals(value.getRecordType())) {
            AppAssistantMessage message = assistantMessageDao.selectByMessageNo(value.getRecordNo());
            if (message != null) {
                vo.setTitle(plainOrDecrypt(message.getTitleText(), message.getTitleCiphertext(), message.getTitleIv(), message.getTitleKeyVersion(), message.getTitleHmac()));
                vo.setContent(plainOrDecrypt(message.getContentText(), message.getContentCiphertext(), message.getContentIv(), message.getContentKeyVersion(), message.getContentHmac()));
                vo.setContentFormat("plain_text");
            }
        }
    }

    private AdminSensitiveMessageContentVO privateContent(String accessNo, String messageNo) {
        AppMessageRecord message = recordDao.selectByMessageNo(messageNo);
        AdminSensitiveContentItemVO item = contentItem("message", message);
        if (item == null) throw new BusinessException(30022, "消息正文已清理或不可用");
        return new AdminSensitiveMessageContentVO(accessNo, "private_message", messageNo, List.of(item));
    }

    private AdminSensitiveMessageContentVO whisperContent(String accessNo, String whisperNo) {
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(whisperNo);
        if (whisper == null) throw new BusinessException(30022, "悄悄话不存在");
        Map<Long, AppMessageRecord> messages = new LinkedHashMap<>();
        recordDao.selectByIds(java.util.stream.Stream.of(whisper.getRequestMessageId(), whisper.getReplyMessageId())
                .filter(Objects::nonNull).toList()).forEach(message -> messages.put(message.getId(), message));
        List<AdminSensitiveContentItemVO> items = new ArrayList<>();
        addContent(items, "request", messages.get(whisper.getRequestMessageId()));
        addContent(items, "reply", messages.get(whisper.getReplyMessageId()));
        if (items.isEmpty()) throw new BusinessException(30022, "悄悄话正文已清理或不可用");
        return new AdminSensitiveMessageContentVO(accessNo, "whisper", whisperNo, items);
    }

    private void addContent(List<AdminSensitiveContentItemVO> items, String role, AppMessageRecord message) {
        AdminSensitiveContentItemVO item = contentItem(role, message);
        if (item != null) items.add(item);
    }

    private AdminSensitiveContentItemVO contentItem(String role, AppMessageRecord message) {
        if (!contentAvailable(message)) return null;
        LocalDateTime eventTime = message.getSentAt() != null ? message.getSentAt()
                : message.getProviderSentAt() != null ? message.getProviderSentAt() : message.getCreateTime();
        return new AdminSensitiveContentItemVO(role, message.getMessageNo(), message.getMessageType(),
                message.getContentText(), eventTime);
    }

    private boolean contentAvailable(AppMessageRecord message) {
        return message != null && message.getContentClearedAt() == null
                && StringUtils.hasText(message.getContentText());
    }

    private String decrypt(byte[] ciphertext, byte[] iv, String keyVersion, String hmac) {
        if (ciphertext == null || ciphertext.length == 0) return null;
        return sensitiveTextCipher.decrypt(new EncryptedMessageContent(ciphertext, iv, keyVersion, hmac));
    }

    private String plainOrDecrypt(String plaintext, byte[] ciphertext, byte[] iv,
                                  String keyVersion, String hmac) {
        return StringUtils.hasText(plaintext) ? plaintext : decrypt(ciphertext, iv, keyVersion, hmac);
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
                && (context.getPermissions().contains("message:sensitive-content:view")
                || context.getPermissions().contains("*") || context.getPermissions().contains("*:*:*"));
        if (!superAdmin && !granted) throw new ForbiddenException("无权查看高敏消息正文");
    }

    private Long zero(Long value) {
        return value == null ? 0L : value;
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String empty(Object value) {
        return value == null ? "ALL" : String.valueOf(value);
    }
}
