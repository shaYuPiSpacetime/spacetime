package com.spacetime.common.task;

import com.spacetime.common.service.MessageImAccountSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 每分钟补偿同步待处理或失败的腾讯云 TIM 用户账号。 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class MessageImAccountSyncJob {
    private static final int BATCH_SIZE = 100;

    private final MessageImAccountSyncService syncService;

    @Scheduled(fixedDelayString = "${message.im-account-sync.delay-ms:60000}")
    public void sync() {
        syncService.syncPending(LocalDateTime.now(), BATCH_SIZE);
    }
}
