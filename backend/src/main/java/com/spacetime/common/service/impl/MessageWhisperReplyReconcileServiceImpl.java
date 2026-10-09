package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.service.MessageDomainService;
import com.spacetime.common.service.MessageWhisperReplyReconcileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/** 悄悄话回复的后台幂等补偿。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageWhisperReplyReconcileServiceImpl
        implements MessageWhisperReplyReconcileService {
    private static final int MAX_BATCH_SIZE = 500;

    private final AppMessageWhisperDao whisperDao;
    private final AppMessageRecordDao recordDao;
    private final MessageDomainService messageDomainService;
    private final AtomicLong finalizeCursor = new AtomicLong(0L);
    private final AtomicLong releaseCursor = new AtomicLong(0L);

    @Override
    public int reconcile(LocalDateTime now, int limit) {
        LocalDateTime reconcileTime = now == null ? LocalDateTime.now() : now;
        int batchSize = Math.max(1, Math.min(limit, MAX_BATCH_SIZE));
        int affected = finalizeDeliveredReplies(reconcileTime, batchSize);
        return affected + releaseDeadReservations(reconcileTime, batchSize);
    }

    private int releaseDeadReservations(LocalDateTime now, int limit) {
        List<AppMessageWhisper> records = whisperDao.selectReplyReservationsReadyToRelease(
                releaseCursor.get(), limit);
        if (records == null || records.isEmpty()) {
            releaseCursor.set(0L);
            return 0;
        }
        releaseCursor.set(lastId(records));
        int affected = 0;
        for (AppMessageWhisper whisper : records) {
            try {
                affected += whisperDao.releaseFailedReplyReservation(
                        whisper.getId(), whisper.getReplyRequestId(),
                        whisper.getReplyMessageId(), now);
            } catch (RuntimeException ex) {
                log.warn("释放悄悄话回复预占失败: whisperNo={}, errorType={}",
                        whisper.getWhisperNo(), ex.getClass().getSimpleName());
            }
        }
        return affected;
    }

    private int finalizeDeliveredReplies(LocalDateTime now, int limit) {
        List<AppMessageWhisper> records = whisperDao.selectReplyReservationsReadyToFinalize(
                finalizeCursor.get(), limit);
        if (records == null || records.isEmpty()) {
            finalizeCursor.set(0L);
            return 0;
        }
        finalizeCursor.set(lastId(records));
        int affected = 0;
        for (AppMessageWhisper whisper : records) {
            try {
                AppMessageRecord reply = recordDao.selectById(whisper.getReplyMessageId());
                if (reply == null || reply.getContentText() == null
                        || reply.getContentText().isBlank()) {
                    log.warn("已投递的悄悄话回复缺少可恢复正文: whisperNo={}",
                            whisper.getWhisperNo());
                    continue;
                }
                messageDomainService.replyWhisper(
                        whisper.getReceiverUserId(), whisper.getWhisperNo(),
                        whisper.getReplyRequestId(), reply.getContentText(),
                        replyEventTime(reply, now));
                affected++;
            } catch (RuntimeException ex) {
                log.warn("收敛已投递的悄悄话回复失败: whisperNo={}, errorType={}",
                        whisper.getWhisperNo(), ex.getClass().getSimpleName());
            }
        }
        return affected;
    }

    private LocalDateTime replyEventTime(AppMessageRecord reply, LocalDateTime fallback) {
        if (reply.getProviderSentAt() != null) {
            return reply.getProviderSentAt();
        }
        return reply.getSentAt() == null ? fallback : reply.getSentAt();
    }

    private long lastId(List<AppMessageWhisper> records) {
        AppMessageWhisper last = records.getLast();
        return last.getId() == null ? 0L : last.getId();
    }
}
