package com.spacetime.common.task;

import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.service.MessageEventInboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 多实例安全认领并消费消息事件 Inbox。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageEventInboxJob {
    private final AppMessageEventInboxDao inboxDao;
    private final MessageEventInboxService inboxService;

    @Scheduled(fixedDelayString = "${message.inbox.fixed-delay-ms:5000}")
    public void consume() {
        LocalDateTime now = LocalDateTime.now();
        for (AppMessageEventInbox inbox : inboxDao.selectClaimable(
                now, now.minusMinutes(10), 100)) {
            try {
                inboxService.process(inbox.getId(), now);
            } catch (RuntimeException ex) {
                log.warn("消息Inbox本轮消费失败，inboxId={}", inbox.getId());
            }
        }
    }
}
