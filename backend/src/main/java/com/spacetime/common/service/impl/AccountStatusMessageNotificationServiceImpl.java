package com.spacetime.common.service.impl;

import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.AccountStatusMessageNotificationService;
import com.spacetime.common.service.AfterCommitExecutor;
import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/** 账号状态通知失败不回滚账号事实，由事实对账任务补齐。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountStatusMessageNotificationServiceImpl
        implements AccountStatusMessageNotificationService {
    private static final DateTimeFormatter EVENT_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final MessageEventPublisher eventPublisher;
    private final MessageEventInboxService inboxService;
    private final AfterCommitExecutor afterCommitExecutor;

    @Override
    public void publishAfterCommit(Long userId, String accountStatus, LocalDateTime changedAt) {
        afterCommitExecutor.execute(() -> {
            try {
                publishNow(userId, accountStatus, changedAt);
            } catch (RuntimeException ex) {
                log.warn("账号安全消息入箱失败，等待事实对账: userId={}, status={}, errorType={}",
                        userId, accountStatus, ex.getClass().getSimpleName());
            }
        });
    }

    @Override
    public boolean publishNow(Long userId, String accountStatus, LocalDateTime changedAt) {
        String result = resultText(accountStatus);
        if (result == null) {
            return false;
        }
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("账号安全消息用户不能为空");
        }
        LocalDateTime effectiveTime = normalize(changedAt);
        String producerEventId = "account-status:" + userId + ":" + accountStatus + ":"
                + effectiveTime.format(EVENT_TIME);
        Long inboxId = eventPublisher.publishSystemMessage(new SystemMessageEvent(
                "prd01", producerEventId, userId, "account:" + userId,
                "account_security", "account_security", Map.of("result", result), null),
                effectiveTime);
        inboxService.process(inboxId, effectiveTime);
        return true;
    }

    private String resultText(String status) {
        if (AccountStatusEnum.FROZEN.getCode().equals(status)) {
            return "你的账号已被冻结，如有疑问请通过申诉入口处理";
        }
        if (AccountStatusEnum.CANCELLING.getCode().equals(status)) {
            return "注销申请已提交，账号已进入冷静期";
        }
        if (AccountStatusEnum.CANCELLED.getCode().equals(status)) {
            return "账号注销已完成";
        }
        return null;
    }

    private LocalDateTime normalize(LocalDateTime value) {
        return (value == null ? LocalDateTime.now() : value).truncatedTo(ChronoUnit.SECONDS);
    }
}
