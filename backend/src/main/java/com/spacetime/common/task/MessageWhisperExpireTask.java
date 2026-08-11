package com.spacetime.common.task;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** 将未回复且已到期的悄悄话迁移到 expired 终态。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageWhisperExpireTask {
    private static final int BATCH_SIZE = 200;
    private static final int MAX_BATCHES_PER_RUN = 50;

    private final AppMessageWhisperDao whisperDao;
    private final AppMessageRecordDao recordDao;

    @Scheduled(fixedDelayString = "${message.whisper-expire.delay-ms:60000}")
    public void expireDue() {
        int affected = expireDueAt(LocalDateTime.now());
        if (affected > 0) {
            log.info("悄悄话到期状态迁移完成: affected={}", affected);
        }
    }

    @Transactional
    public int expireDueAt(LocalDateTime now) {
        LocalDateTime cutoff = now == null ? LocalDateTime.now() : now;
        int total = 0;
        for (int batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
            int affected = whisperDao.expireDue(cutoff);
            total += affected;
            if (affected < BATCH_SIZE) {
                if (total > 0) {
                    recordDao.schedulePurgeForTerminalWhispers(cutoff);
                }
                return total;
            }
        }
        recordDao.schedulePurgeForTerminalWhispers(cutoff);
        log.warn("悄悄话到期状态迁移单轮达到追批上限: affected={}, batches={}",
                total, MAX_BATCHES_PER_RUN);
        return total;
    }
}
