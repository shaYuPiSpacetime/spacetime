package com.spacetime.common.task;

import com.spacetime.miniapp.service.MiniappAccountSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 注销后悔期到期执行任务。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccountCancellationTask {
    private final MiniappAccountSecurityService accountSecurityService;

    @Scheduled(
            fixedDelayString = "${account-cancellation.fixed-delay-ms:60000}",
            initialDelayString = "${account-cancellation.initial-delay-ms:15000}"
    )
    public void executeDueCancellations() {
        int affected = accountSecurityService.executeDueCancellations();
        if (affected > 0) {
            log.info("账号注销到期任务执行完成: affected={}", affected);
        }
    }
}
