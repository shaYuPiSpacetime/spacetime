package com.spacetime.common.task;

import com.spacetime.common.service.MessageWhisperReplyReconcileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 低频扫描并收敛历史悄悄话回复卡单。 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class MessageWhisperReplyReconcileTask {
    private static final int BATCH_SIZE = 100;

    private final MessageWhisperReplyReconcileService reconcileService;

    @Scheduled(initialDelayString = "${message.whisper-reply-reconcile.initial-delay-ms:10000}",
            fixedDelayString = "${message.whisper-reply-reconcile.fixed-delay-ms:30000}")
    public void reconcile() {
        int affected = reconcileService.reconcile(LocalDateTime.now(), BATCH_SIZE);
        if (affected > 0) {
            log.info("历史悄悄话回复卡单补偿完成: count={}", affected);
        }
    }
}
