package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.service.impl.MessageAssetFactReconcileServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageAssetFactReconcileServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 14, 0);

    @Mock private TradeOrderDao tradeOrderDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AssetResultMessageNotificationService notificationService;

    @Test
    void shouldReconcileOrdersAndWhisperCompensations() {
        TradeOrder order = new TradeOrder();
        order.setOrderNo("TO-1");
        order.setOrderStatus("success");
        order.setUpdateTime(NOW.minusMinutes(5));
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setWhisperNo("WSP-1");
        whisper.setPaymentStatus("refunded");
        whisper.setUpdateTime(NOW.minusMinutes(3));
        when(tradeOrderDao.selectMessageNotifiableWithoutInbox(NOW.minusHours(24), 200))
                .thenReturn(List.of(order));
        when(whisperDao.selectRefundedWithoutMessage(NOW.minusHours(24), 200))
                .thenReturn(List.of(whisper));
        when(notificationService.publishOrderNow(order, NOW.minusMinutes(5))).thenReturn(true);
        when(notificationService.publishWhisperCompensationNow(whisper, NOW.minusMinutes(3)))
                .thenReturn(true);

        int count = new MessageAssetFactReconcileServiceImpl(
                tradeOrderDao, whisperDao, notificationService)
                .reconcileRecentAssetResults(NOW, 200);

        assertThat(count).isEqualTo(2);
        verify(notificationService).publishOrderNow(order, NOW.minusMinutes(5));
        verify(notificationService).publishWhisperCompensationNow(whisper, NOW.minusMinutes(3));
    }
}
