package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.CommunityMessageOutboxDao;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.CommunityMessageOutboxService;
import com.spacetime.common.service.MessageEventPublisher;
import com.spacetime.common.service.MessageRetryPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** 社区 Outbox 消费器；只传递用户可见结果，不透传后台备注和风控原因。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityMessageOutboxServiceImpl implements CommunityMessageOutboxService {
    private static final long PROCESSING_TIMEOUT_MINUTES = 10;
    private static final Set<String> COMMUNITY_BIZ_TYPES = Set.of(
            "community_interaction_summary", "community_hot_topic", "featured_content",
            "community_activity", "community_recall");

    private final CommunityMessageOutboxDao outboxDao;
    private final MessageEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Override
    public void process(Long outboxId, LocalDateTime now) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        if (outboxDao.claim(outboxId, effectiveNow,
                effectiveNow.minusMinutes(PROCESSING_TIMEOUT_MINUTES)) != 1) {
            return;
        }
        CommunityEventOutbox outbox = requireOutbox(outboxId);
        try {
            eventPublisher.publishSystemMessage(toSystemMessageEvent(outbox), effectiveNow);
            if (outboxDao.markSent(outboxId, effectiveNow) != 1) {
                throw new IllegalStateException("社区消息Outbox状态更新冲突");
            }
        } catch (RuntimeException ex) {
            markFailure(outbox, ex, effectiveNow);
            throw ex;
        }
    }

    private SystemMessageEvent toSystemMessageEvent(CommunityEventOutbox outbox) {
        JsonNode payload = readPayload(outbox);
        Long recipientUserId = longValue(payload, "recipientUserId");
        String eventType = normalize(outbox.getEventType());
        String aggregateType = normalize(outbox.getAggregateType());
        String bizNo = firstText(payload, "reportNo", "bizNo");
        if (bizNo == null || bizNo.isBlank()) {
            bizNo = requireText(outbox.getAggregateNo(), "社区事件业务编号缺失");
        }

        if (COMMUNITY_BIZ_TYPES.contains(eventType)) {
            return event("community", outbox, recipientUserId, bizNo, eventType, eventType,
                    Map.of("summary", textValue(payload, "summary")));
        }
        String result = textValue(payload, "result");
        if ("report_result".equals(eventType)) {
            return event("prd05", outbox, recipientUserId, bizNo,
                    "report_result", "report_result",
                    Map.of("result", reportResultText(result)));
        }
        if (!"moderation_result".equals(eventType)) {
            throw new IllegalArgumentException("不支持的社区消息事件类型");
        }
        if ("post".equals(aggregateType) || "comment".equals(aggregateType)) {
            return event("prd05", outbox, recipientUserId, bizNo,
                    "content_review_result", "content_review_result",
                    Map.of("contentType", "post".equals(aggregateType) ? "动态" : "评论",
                            "result", contentReviewResultText(result)));
        }
        if ("report".equals(aggregateType)) {
            return event("prd05", outbox, recipientUserId, bizNo,
                    "violation_result", "violation_result",
                    Map.of("result", violationResultText(result)));
        }
        throw new IllegalArgumentException("不支持的社区消息聚合类型");
    }

    private SystemMessageEvent event(String sourceModule, CommunityEventOutbox outbox,
                                     Long recipientUserId,
                                     String bizNo, String templateCode, String bizType,
                                     Map<String, Object> variables) {
        return new SystemMessageEvent(sourceModule,
                requireText(outbox.getEventNo(), "社区事件编号缺失"),
                recipientUserId, bizNo, templateCode, bizType, variables, null);
    }

    private JsonNode readPayload(CommunityEventOutbox outbox) {
        try {
            JsonNode payload = objectMapper.readTree(outbox.getPayload());
            if (payload == null || !payload.isObject()) {
                throw new IllegalArgumentException("社区事件载荷格式错误");
            }
            return payload;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("社区事件载荷解析失败", ex);
        }
    }

    private Long longValue(JsonNode payload, String field) {
        JsonNode value = payload.get(field);
        if (value == null || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("社区事件接收用户缺失");
        }
        return value.longValue();
    }

    private String textValue(JsonNode payload, String field) {
        JsonNode value = payload.get(field);
        if (value == null || !value.isTextual() || value.textValue().isBlank()) {
            throw new IllegalArgumentException("社区事件处理结果缺失");
        }
        return value.textValue();
    }

    private String firstText(JsonNode payload, String... fields) {
        for (String field : fields) {
            JsonNode value = payload.get(field);
            if (value != null && value.isTextual() && !value.textValue().isBlank()) {
                return value.textValue();
            }
        }
        return null;
    }

    private String reportResultText(String code) {
        return switch (normalize(code)) {
            case "pending" -> "举报已受理";
            case "processing" -> "举报处理中";
            case "valid", "resolved" -> "举报成立";
            case "invalid", "rejected" -> "举报不成立";
            case "merged" -> "举报已合并处理";
            default -> "举报处理结果已更新";
        };
    }

    private String contentReviewResultText(String code) {
        return switch (normalize(code)) {
            case "published", "approved", "pass" -> "审核通过";
            case "rejected", "reject" -> "审核未通过";
            case "blocked" -> "内容已下架";
            case "pending_manual", "review" -> "已转人工复核";
            default -> "审核结果已更新";
        };
    }

    private String violationResultText(String code) {
        return switch (normalize(code)) {
            case "warn_user" -> "已收到平台警告";
            case "mute_user" -> "账号已被禁言";
            case "ip_block" -> "当前网络访问已受限";
            case "freeze_user" -> "账号已被冻结";
            default -> "账号治理结果已更新";
        };
    }

    private void markFailure(CommunityEventOutbox outbox, RuntimeException ex,
                             LocalDateTime now) {
        int retryCount = valueOrZero(outbox.getRetryCount()) + 1;
        boolean dead = MessageRetryPolicy.isDead(retryCount);
        LocalDateTime nextRetryAt = dead ? null : now.plus(MessageRetryPolicy.nextDelay(retryCount));
        outboxDao.markFailure(outbox.getId(), retryCount, dead, nextRetryAt,
                sanitize(ex.getMessage()), now);
        if (dead) {
            log.error("Community message Outbox entered dead state: outboxId={}, eventNo={}, "
                            + "eventType={}, aggregateNo={}, retryCount={}, errorType={}",
                    outbox.getId(), outbox.getEventNo(), outbox.getEventType(),
                    outbox.getAggregateNo(), retryCount, ex.getClass().getSimpleName(), ex);
        }
    }

    private CommunityEventOutbox requireOutbox(Long outboxId) {
        CommunityEventOutbox outbox = outboxDao.selectById(outboxId);
        if (outbox == null) {
            throw new IllegalStateException("社区消息Outbox记录不存在");
        }
        return outbox;
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String sanitize(String message) {
        String value = message == null || message.isBlank()
                ? "社区事件转换系统消息失败"
                : message.replaceAll("[\\r\\n\\t]+", " ");
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
