package com.spacetime.common.task;

import com.spacetime.common.service.PromotionSettlementDomainService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.YearMonth;

/**
 * 每月校园推广员结算任务。
 */
@Component
@RequiredArgsConstructor
public class PromotionSettlementJob {
    private static final ZoneId BEIJING = ZoneId.of("Asia/Shanghai");
    private final PromotionSettlementDomainService settlementService;

    @Scheduled(cron = "0 0 1 1 * ?", zone = "Asia/Shanghai")
    public void generatePreviousMonth() {
        settlementService.generate(YearMonth.now(BEIJING).minusMonths(1));
    }
}
