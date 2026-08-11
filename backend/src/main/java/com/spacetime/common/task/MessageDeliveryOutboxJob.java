package com.spacetime.common.task;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.service.MessageDeliveryOutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/** 多实例安全认领并处理消息投递 Outbox。 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class MessageDeliveryOutboxJob {
    private static final int BATCH_SIZE = 100;
    private static final long STALE_MINUTES = 10;

    private final AppMessageDeliveryOutboxDao outboxDao;
    private final MessageDeliveryOutboxService deliveryService;

    @Scheduled(fixedDelayString = "${message.delivery-outbox.delay-ms:2000}")
    public void deliver() {
        LocalDateTime now = LocalDateTime.now();
        List<AppMessageDeliveryOutbox> records = outboxDao.selectClaimable(
                now, now.minusMinutes(STALE_MINUTES), BATCH_SIZE);
        if (records == null || records.isEmpty()) {
            return;
        }
        for (AppMessageDeliveryOutbox record : records) {
            try {
                deliveryService.process(record.getId(), LocalDateTime.now());
            } catch (RuntimeException ex) {
                log.warn("消息Outbox投递失败: outboxNo={}, errorType={}",
                        record.getOutboxNo(), ex.getClass().getSimpleName());
            }
        }
    }
}
