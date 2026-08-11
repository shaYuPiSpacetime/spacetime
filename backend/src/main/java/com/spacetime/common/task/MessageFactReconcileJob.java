package com.spacetime.common.task;

import com.spacetime.common.service.MessageFactReconcileService;
import com.spacetime.common.service.MessageAccountFactReconcileService;
import com.spacetime.common.service.MessageAssetFactReconcileService;
import com.spacetime.common.service.MessagePromotionFactReconcileService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 每五分钟补齐近期匹配会话和跨模块结果消息。 */
@Component
@RequiredArgsConstructor
public class MessageFactReconcileJob {
    private static final int BATCH_SIZE = 200;

    private final MessageFactReconcileService reconcileService;
    private final MessagePromotionFactReconcileService promotionReconcileService;
    private final MessageAccountFactReconcileService accountReconcileService;
    private final MessageAssetFactReconcileService assetReconcileService;

    @Scheduled(fixedDelayString = "${message.fact-reconcile.delay-ms:300000}")
    public void reconcile() {
        LocalDateTime now = LocalDateTime.now();
        reconcileService.reconcileRecentMatches(now, BATCH_SIZE);
        promotionReconcileService.reconcileRecentRewards(now, BATCH_SIZE);
        accountReconcileService.reconcileRecentAccountStatuses(now, BATCH_SIZE);
        assetReconcileService.reconcileRecentAssetResults(now, BATCH_SIZE);
    }
}
