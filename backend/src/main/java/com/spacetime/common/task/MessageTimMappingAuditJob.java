package com.spacetime.common.task;

import com.spacetime.common.service.MessageTimMappingAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Periodically alerts on stale local TIM mapping inconsistencies. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class MessageTimMappingAuditJob {
    private static final int BATCH_SIZE = 100;

    private final MessageTimMappingAuditService auditService;

    @Scheduled(fixedDelayString = "${message.tim-mapping-audit.delay-ms:300000}")
    public void audit() {
        auditService.auditLocalMappings(LocalDateTime.now(), BATCH_SIZE);
    }
}
