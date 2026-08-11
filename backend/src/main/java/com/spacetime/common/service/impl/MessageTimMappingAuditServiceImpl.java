package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.service.MessageTimMappingAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** Detects stale local TIM mapping inconsistencies and raises an operational alert. */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageTimMappingAuditServiceImpl implements MessageTimMappingAuditService {
    private static final long STALE_MINUTES = 10;

    private final AppMessageDeliveryOutboxDao outboxDao;

    @Override
    public int auditLocalMappings(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        List<AppMessageDeliveryOutbox> inconsistencies = outboxDao.selectMappingInconsistencies(
                effectiveNow.minusMinutes(STALE_MINUTES), Math.max(1, Math.min(limit, 1000)));
        if (inconsistencies == null || inconsistencies.isEmpty()) {
            return 0;
        }
        for (AppMessageDeliveryOutbox outbox : inconsistencies) {
            log.error("TIM local mapping inconsistency: outboxId={}, outboxNo={}, eventKey={}, "
                            + "status={}, providerMsgKey={}, aggregateId={}",
                    outbox.getId(), outbox.getOutboxNo(), outbox.getEventKey(),
                    outbox.getStatus(), outbox.getProviderMsgKey(), outbox.getAggregateId());
        }
        return inconsistencies.size();
    }
}
