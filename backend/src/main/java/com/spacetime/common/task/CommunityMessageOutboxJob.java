package com.spacetime.common.task;

import com.spacetime.common.dao.CommunityMessageOutboxDao;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.service.CommunityMessageOutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/** 将社区治理结果可靠投递到 PRD-03 系统消息 Inbox。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityMessageOutboxJob {
    private static final int BATCH_SIZE = 100;
    private static final long STALE_MINUTES = 10;

    private final CommunityMessageOutboxDao outboxDao;
    private final CommunityMessageOutboxService outboxService;

    @Scheduled(fixedDelayString = "${message.community-outbox.delay-ms:5000}")
    public void deliver() {
        LocalDateTime now = LocalDateTime.now();
        List<CommunityEventOutbox> events = outboxDao.selectClaimable(
                now, now.minusMinutes(STALE_MINUTES), BATCH_SIZE);
        if (events == null || events.isEmpty()) {
            return;
        }
        for (CommunityEventOutbox event : events) {
            try {
                outboxService.process(event.getId(), LocalDateTime.now());
            } catch (RuntimeException ex) {
                log.warn("社区事件转系统消息失败: eventNo={}, errorType={}",
                        event.getEventNo(), ex.getClass().getSimpleName());
            }
        }
    }
}
