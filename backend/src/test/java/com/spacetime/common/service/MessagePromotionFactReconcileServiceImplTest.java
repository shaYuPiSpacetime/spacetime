package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.impl.MessagePromotionFactReconcileServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MessagePromotionFactReconcileServiceImplTest {

    @Test
    void shouldReconcileRecentTerminalRewardsMissingMessageInbox() {
        PromotionRewardLogDao rewardDao = mock(PromotionRewardLogDao.class);
        PromotionMessageNotificationService notificationService =
                mock(PromotionMessageNotificationService.class);
        MessagePromotionFactReconcileServiceImpl service =
                new MessagePromotionFactReconcileServiceImpl(rewardDao, notificationService);
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 12, 0);
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setId(1L);
        when(rewardDao.selectTerminalWithoutMessage(now.minusHours(24), 200))
                .thenReturn(List.of(reward));
        when(notificationService.publishRewardResult(reward, now)).thenReturn(true);

        int reconciled = service.reconcileRecentRewards(now, 200);

        assertThat(reconciled).isEqualTo(1);
        verify(notificationService).publishRewardResult(eq(reward), eq(now));
    }
}
