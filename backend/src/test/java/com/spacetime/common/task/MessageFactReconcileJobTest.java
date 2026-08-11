package com.spacetime.common.task;

import com.spacetime.common.service.MessageFactReconcileService;
import com.spacetime.common.service.MessageAccountFactReconcileService;
import com.spacetime.common.service.MessageAssetFactReconcileService;
import com.spacetime.common.service.MessagePromotionFactReconcileService;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class MessageFactReconcileJobTest {

    @Test
    void shouldRunBoundedRecentFactReconciliation() {
        MessageFactReconcileService service = mock(MessageFactReconcileService.class);
        MessagePromotionFactReconcileService promotionService =
                mock(MessagePromotionFactReconcileService.class);
        MessageAccountFactReconcileService accountService =
                mock(MessageAccountFactReconcileService.class);
        MessageAssetFactReconcileService assetService =
                mock(MessageAssetFactReconcileService.class);

        new MessageFactReconcileJob(service, promotionService, accountService, assetService).reconcile();

        verify(service).reconcileRecentMatches(any(), org.mockito.ArgumentMatchers.eq(200));
        verify(promotionService).reconcileRecentRewards(any(), org.mockito.ArgumentMatchers.eq(200));
        verify(accountService).reconcileRecentAccountStatuses(
                any(), org.mockito.ArgumentMatchers.eq(200));
        verify(assetService).reconcileRecentAssetResults(
                any(), org.mockito.ArgumentMatchers.eq(200));
    }
}
