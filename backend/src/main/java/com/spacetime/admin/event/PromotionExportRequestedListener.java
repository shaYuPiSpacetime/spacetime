package com.spacetime.admin.event;

import com.spacetime.admin.service.PromotionAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 在独立线程执行推广导出，避免阻塞创建任务接口。
 */
@Component
@RequiredArgsConstructor
public class PromotionExportRequestedListener {
    private final PromotionAdminService promotionAdminService;

    @Async("promotionExportExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRequested(PromotionExportRequestedEvent event) {
        promotionAdminService.executeExportTask(event.taskNo());
    }
}
