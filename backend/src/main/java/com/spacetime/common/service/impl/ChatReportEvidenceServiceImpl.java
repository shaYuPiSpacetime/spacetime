package com.spacetime.common.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.ChatEvidenceSnapshot;
import com.spacetime.common.community.TrustedChatReportContext;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.CommunityReportEvidenceDao;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.entity.CommunityReportEvidence;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.ChatReportEvidenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 案件证据使用独立随机 IV 加密，不修改或复用消息主表正文。 */
@Service
@RequiredArgsConstructor
public class ChatReportEvidenceServiceImpl implements ChatReportEvidenceService {
    private final AppMessageRecordDao recordDao;
    private final CommunityReportEvidenceDao evidenceDao;
    private final SensitiveTextCipher cipher;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ChatEvidenceSnapshot freeze(CommunityReport report, TrustedChatReportContext context,
                                       LocalDateTime now) {
        if (report == null || report.getId() == null || context == null) {
            throw new BusinessException(505016, "chat_report_unavailable");
        }
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        List<Long> requestedIds = context.evidenceMessageIds() == null
                ? List.of() : context.evidenceMessageIds();
        Map<Long, AppMessageRecord> records = recordDao.selectByIds(requestedIds).stream()
                .collect(Collectors.toMap(AppMessageRecord::getId, Function.identity(),
                        (left, right) -> left));
        Map<String, CommunityReportEvidence> existing = evidenceDao.selectByReportId(report.getId())
                .stream().collect(Collectors.toMap(
                        evidence -> evidence.getSourceBizNo() + "|" + evidence.getEvidenceType(),
                        Function.identity(), (left, right) -> left));
        int frozen = existing.size();
        boolean complete = !requestedIds.isEmpty();
        int order = 0;
        for (Long messageId : requestedIds) {
            AppMessageRecord record = records.get(messageId);
            String evidenceType = messageId.equals(context.targetMessageId()) ? "target" : "context";
            if (record == null || !StringUtils.hasText(record.getContentText())) {
                complete = false;
                order++;
                continue;
            }
            String key = record.getMessageNo() + "|" + evidenceType;
            if (existing.containsKey(key)) {
                order++;
                continue;
            }
            EncryptedMessageContent encrypted = cipher.encrypt(record.getContentText());
            CommunityReportEvidence evidence = new CommunityReportEvidence();
            evidence.setEvidenceNo("EVD-" + UUID.randomUUID().toString().replace("-", ""));
            evidence.setReportId(report.getId());
            evidence.setReportNo(report.getReportNo());
            evidence.setEvidenceType(evidenceType);
            evidence.setTargetType("whisper".equals(context.sourceType()) ? "whisper" : "message");
            evidence.setSourceBizNo(record.getMessageNo());
            evidence.setConversationNo(record.getConversationNo());
            evidence.setSenderUserId(record.getSenderUserId());
            evidence.setReceiverUserId(record.getReceiverUserId());
            evidence.setMessageType(record.getMessageType());
            evidence.setContentCiphertext(encrypted.ciphertext());
            evidence.setContentIv(encrypted.iv());
            evidence.setContentKeyVersion(encrypted.keyVersion());
            evidence.setContentHmac(encrypted.hmac());
            evidence.setEventTime(record.getProviderSentAt() == null
                    ? valueOrNow(record.getCreateTime(), effectiveNow) : record.getProviderSentAt());
            evidence.setContextOrder(order++);
            evidence.setSeverity("normal");
            evidence.setSnapshotAt(effectiveNow);
            evidence.setRetainUntil(effectiveNow.plusYears(3));
            evidenceDao.insert(evidence);
            frozen++;
        }
        String status = complete ? "complete" : "partial";
        return new ChatEvidenceSnapshot(status, frozen, metadata(status, frozen, requestedIds.size()));
    }

    private String metadata(String status, int frozen, int requested) {
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("snapshotStatus", status);
            metadata.put("evidenceCount", frozen);
            metadata.put("requestedEvidenceCount", requested);
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(505016, "chat_report_unavailable");
        }
    }

    private LocalDateTime valueOrNow(LocalDateTime value, LocalDateTime now) {
        return value == null ? now : value;
    }
}
