package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.service.MessageEventHandler;
import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageRetryPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 消息事件 Inbox 协调器。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageEventInboxServiceImpl implements MessageEventInboxService {
    private static final long PROCESSING_TIMEOUT_MINUTES = 10;
    private final AppMessageEventInboxDao inboxDao;
    private final List<MessageEventHandler> handlers;

    @Override
    public void process(Long inboxId, LocalDateTime now) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        if (inboxDao.claim(inboxId, effectiveNow,
                effectiveNow.minusMinutes(PROCESSING_TIMEOUT_MINUTES)) != 1) {
            return;
        }
        AppMessageEventInbox inbox = inboxDao.selectById(inboxId);
        if (inbox == null) {
            return;
        }
        try {
            MessageEventHandler handler = handlers.stream()
                    .filter(item -> item.supports(inbox.getSourceModule(), inbox.getEventType()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("消息事件缺少处理器"));
            handler.handle(inbox);
            if (inboxDao.markSuccessAndClearPayload(inboxId, effectiveNow) != 1) {
                throw new IllegalStateException("Inbox成功状态更新冲突");
            }
        } catch (RuntimeException ex) {
            int retryCount = valueOrZero(inbox.getRetryCount()) + 1;
            boolean payloadExpired = inbox.getPayloadExpiresAt() != null
                    && !effectiveNow.isBefore(inbox.getPayloadExpiresAt());
            boolean dead = MessageRetryPolicy.isDead(retryCount) || payloadExpired;
            inboxDao.markFailure(inboxId, retryCount, dead,
                    dead ? null : effectiveNow.plus(MessageRetryPolicy.nextDelay(retryCount)),
                    ex.getClass().getSimpleName(), summarize(ex.getMessage()), effectiveNow);
            if (dead) {
                log.error("Message event Inbox entered dead state: inboxId={}, sourceModule={}, "
                                + "eventType={}, retryCount={}, errorType={}",
                        inboxId, inbox.getSourceModule(), inbox.getEventType(), retryCount,
                        ex.getClass().getSimpleName(), ex);
                return;
            }
            log.warn("Message event processing failed: inboxId={}, retryCount={}",
                    inboxId, retryCount, ex);
            throw ex;
        }
    }

    @Override
    public int clearExpiredPayloads(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        return inboxDao.clearExpiredPayloads(effectiveNow, Math.max(1, Math.min(limit, 1000)));
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String summarize(String message) {
        if (message == null || message.isBlank()) {
            return "消息事件处理失败";
        }
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
