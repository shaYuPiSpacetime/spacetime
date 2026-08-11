package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.provider.InstantMessageCommand;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.provider.InstantMessageProvider;
import com.spacetime.common.provider.InstantMessageSendResult;
import com.spacetime.common.service.MessageDeliveryOutboxService;
import com.spacetime.common.service.MessageRetryPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

/** 从消息主表读取正文并可靠投递，Outbox 不复制聊天正文。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageDeliveryOutboxServiceImpl implements MessageDeliveryOutboxService {
    private static final long PROCESSING_TIMEOUT_MINUTES = 10;
    private final AppMessageDeliveryOutboxDao outboxDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageWhisperDao whisperDao;
    private final InstantMessageProvider instantMessageProvider;

    @Override
    public void process(Long outboxId, LocalDateTime now) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        if (outboxDao.claim(outboxId, effectiveNow,
                effectiveNow.minusMinutes(PROCESSING_TIMEOUT_MINUTES)) != 1) {
            return;
        }
        AppMessageDeliveryOutbox outbox = requireOutbox(outboxId);
        AppMessageRecord record = null;
        try {
            validateOutbox(outbox);
            record = requireRecord(outbox);
            if (isAlreadySent(record)) {
                confirmBusinessDelivery(outbox, record,
                        record.getProviderSentAt() == null ? effectiveNow : record.getProviderSentAt());
                markOutboxSent(outbox, record.getTimMsgKey(),
                        record.getProviderSentAt() == null ? effectiveNow : record.getProviderSentAt());
                return;
            }
            if (record.getContentText() == null) {
                throw new InstantMessageException("MESSAGE_BODY_CLEARED",
                        "消息正文已清理，禁止再次投递", false);
            }

            InstantMessageSendResult result = instantMessageProvider.send(new InstantMessageCommand(
                    record.getId(), record.getMessageNo(), outbox.getSenderUserId(),
                    outbox.getReceiverUserId(), outbox.getEventType(), record.getContentText(),
                    outbox.getPayloadJson(), outbox.getProtocolVersion()));
            requireProviderResult(result);
            confirmSingleMapping(record, result, effectiveNow);
            LocalDateTime sentAt = result.sentAt() == null ? effectiveNow : result.sentAt();
            confirmBusinessDelivery(outbox, record, sentAt);
            markOutboxSent(outbox, result.timMsgKey(), sentAt);
        } catch (RuntimeException ex) {
            handleFailure(outbox, record, ex, effectiveNow);
            throw ex;
        }
    }

    private void validateOutbox(AppMessageDeliveryOutbox outbox) {
        if (!"tencent_im".equals(outbox.getChannel()) || !"message".equals(outbox.getAggregateType())) {
            throw new InstantMessageException("OUTBOX_PROTOCOL_INVALID",
                    "当前Outbox处理器只接受腾讯云TIM消息聚合", false);
        }
    }

    private AppMessageRecord requireRecord(AppMessageDeliveryOutbox outbox) {
        AppMessageRecord record = recordDao.selectById(outbox.getAggregateId());
        if (record == null) {
            throw new InstantMessageException("MESSAGE_NOT_FOUND", "Outbox关联消息不存在", false);
        }
        return record;
    }

    private void confirmSingleMapping(AppMessageRecord record, InstantMessageSendResult result,
                                      LocalDateTime effectiveNow) {
        AppMessageRecord mapped = recordDao.selectByTimMsgKey(result.timMsgKey());
        if (mapped != null && !Objects.equals(mapped.getId(), record.getId())) {
            throw new InstantMessageException("TIM_MAPPING_CONFLICT",
                    "TIM消息映射冲突，禁止覆盖既有消息", false);
        }
        if (mapped != null) {
            return;
        }
        LocalDateTime sentAt = result.sentAt() == null ? effectiveNow : result.sentAt();
        if (recordDao.confirmTimMapping(record.getId(), valueOrZero(record.getVersion()),
                result.timMessageId(), result.timMsgKey(), sentAt) != 1) {
            AppMessageRecord current = recordDao.selectById(record.getId());
            boolean sameMapping = current != null && isAlreadySent(current)
                    && Objects.equals(result.timMessageId(), current.getTimMessageId())
                    && Objects.equals(result.timMsgKey(), current.getTimMsgKey());
            if (!sameMapping) {
                throw new InstantMessageException("TIM_MAPPING_STATE_CONFLICT",
                        "消息TIM映射状态更新冲突", false);
            }
        }
    }

    private void confirmBusinessDelivery(AppMessageDeliveryOutbox outbox,
                                         AppMessageRecord record, LocalDateTime sentAt) {
        if ("whisper_request".equals(outbox.getEventType())) {
            whisperDao.confirmRequestDelivery(record.getId(), sentAt);
        }
    }

    private void markOutboxSent(AppMessageDeliveryOutbox outbox, String timMsgKey,
                                LocalDateTime sentAt) {
        if (outboxDao.markSent(outbox.getId(), timMsgKey, sentAt) != 1) {
            throw new InstantMessageException("OUTBOX_STATE_CONFLICT",
                    "Outbox发送状态更新冲突", true);
        }
    }

    private void handleFailure(AppMessageDeliveryOutbox outbox, AppMessageRecord knownRecord,
                               RuntimeException exception, LocalDateTime now) {
        Failure failure = classify(exception);
        int retryCount = valueOrZero(outbox.getRetryCount()) + 1;
        boolean dead = !failure.retryable() || MessageRetryPolicy.isDead(retryCount);
        LocalDateTime nextRetry = dead ? null : now.plus(MessageRetryPolicy.nextDelay(retryCount));
        outboxDao.markFailure(outbox.getId(), retryCount, dead, nextRetry,
                failure.code(), failure.summary(), now);
        if (!dead) {
            return;
        }
        log.error("Message delivery Outbox entered dead state: outboxId={}, outboxNo={}, "
                        + "eventType={}, aggregateId={}, retryCount={}, errorCode={}",
                outbox.getId(), outbox.getOutboxNo(), outbox.getEventType(),
                outbox.getAggregateId(), retryCount, failure.code());

        AppMessageRecord current = knownRecord == null
                ? recordDao.selectById(outbox.getAggregateId())
                : recordDao.selectById(knownRecord.getId());
        if (current == null) {
            return;
        }
        if (MessageSendStatusEnum.QUEUED.getCode().equals(current.getSendStatus())) {
            recordDao.markFailed(current.getId(), valueOrZero(current.getVersion()),
                    failure.code(), failure.summary(), now);
        }
        if ("whisper_request".equals(outbox.getEventType())) {
            whisperDao.failRequestDelivery(current.getId(), "tim_delivery_failed", now);
        } else if ("whisper_reply".equals(outbox.getEventType())) {
            releaseReplyReservation(current, now);
        }
        recordDao.schedulePurgeByMessageId(current.getId(), now);
    }

    private void releaseReplyReservation(AppMessageRecord replyMessage, LocalDateTime now) {
        if (replyMessage.getSourceBizNo() == null || replyMessage.getSourceBizNo().isBlank()) {
            return;
        }
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(replyMessage.getSourceBizNo());
        if (whisper == null || !Objects.equals(replyMessage.getId(), whisper.getReplyMessageId())
                || whisper.getReplyRequestId() == null) {
            return;
        }
        whisperDao.releaseReplyReservation(whisper.getId(), whisper.getReplyRequestId(),
                replyMessage.getId(), now);
    }

    private Failure classify(RuntimeException exception) {
        if (exception instanceof InstantMessageException imException) {
            return new Failure(nonBlank(imException.getProviderCode(), "TIM_DELIVERY_ERROR"),
                    sanitize(imException.getMessage()), imException.isRetryable());
        }
        return new Failure("TIM_DELIVERY_ERROR", sanitize(exception.getMessage()), true);
    }

    private String sanitize(String message) {
        String value = nonBlank(message, "腾讯云TIM投递失败").replaceAll("[\\r\\n\\t]+", " ");
        return value.length() <= 200 ? value : value.substring(0, 200);
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private boolean isAlreadySent(AppMessageRecord record) {
        return MessageSendStatusEnum.SENT.getCode().equals(record.getSendStatus())
                && record.getTimMessageId() != null && !record.getTimMessageId().isBlank()
                && record.getTimMsgKey() != null && !record.getTimMsgKey().isBlank();
    }

    private AppMessageDeliveryOutbox requireOutbox(Long outboxId) {
        AppMessageDeliveryOutbox outbox = outboxDao.selectById(outboxId);
        if (outbox == null) {
            throw new IllegalStateException("Outbox记录不存在");
        }
        return outbox;
    }

    private void requireProviderResult(InstantMessageSendResult result) {
        if (result == null || result.timMsgKey() == null || result.timMsgKey().isBlank()
                || result.timMessageId() == null || result.timMessageId().isBlank()) {
            throw new InstantMessageException("TIM_RESPONSE_INVALID",
                    "腾讯云TIM未返回完整消息映射", true);
        }
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private record Failure(String code, String summary, boolean retryable) {
    }
}
