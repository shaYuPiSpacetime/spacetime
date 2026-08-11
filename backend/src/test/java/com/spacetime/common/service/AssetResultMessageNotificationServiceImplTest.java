package com.spacetime.common.service;

import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.AssetResultMessageNotificationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetResultMessageNotificationServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 14, 0);

    @Mock private CoinPackageDao coinPackageDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private MessageEventPublisher eventPublisher;
    @Mock private MessageEventInboxService inboxService;
    @Mock private AfterCommitExecutor afterCommitExecutor;

    @Test
    void coinRechargeShouldPublishAfterCommitWithStableOrderEvent() {
        doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(afterCommitExecutor).execute(any());
        CoinPackage coinPackage = new CoinPackage();
        coinPackage.setCoinCount(60);
        coinPackage.setBonusCoinCount(10);
        when(coinPackageDao.selectById(3L)).thenReturn(coinPackage);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(81L);
        TradeOrder order = order("success", "coin");
        order.setPackageId(3L);

        service().publishOrderAfterCommit(order, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("prd04");
        assertThat(event.producerEventId()).isEqualTo("order:TO-1:success");
        assertThat(event.receiverUserId()).isEqualTo(7L);
        assertThat(event.templateCode()).isEqualTo("asset_result");
        assertThat(event.variables().get("result")).isEqualTo("千寻币已到账：70");
        verify(inboxService).process(81L, NOW);
    }

    @Test
    void vipPaymentShouldUseCommittedAssetExpiry() {
        UserAsset asset = new UserAsset();
        asset.setVipExpireTime(LocalDateTime.of(2026, 9, 10, 14, 0));
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(82L);

        assertThat(service().publishOrderNow(order("success", "vip"), NOW)).isTrue();

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        assertThat(captor.getValue().variables().get("result"))
                .isEqualTo("会员已开通，有效期至 2026-09-10 14:00");
    }

    @Test
    void whisperCoinCompensationShouldPublishRefundSummary() {
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(83L);
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setWhisperNo("WSP-1");
        whisper.setSenderUserId(7L);
        whisper.setPaymentStatus("refunded");
        whisper.setPayType("coin");
        whisper.setCoinAmount(8);

        assertThat(service().publishWhisperCompensationNow(whisper, NOW)).isTrue();

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        assertThat(captor.getValue().producerEventId()).isEqualTo("whisper:WSP-1:refunded");
        assertThat(captor.getValue().variables().get("result"))
                .isEqualTo("悄悄话发送失败，8千寻币已原路退回");
    }

    private TradeOrder order(String status, String type) {
        TradeOrder order = new TradeOrder();
        order.setId(11L);
        order.setOrderNo("TO-1");
        order.setUserId(7L);
        order.setOrderType(type);
        order.setOrderStatus(status);
        order.setPayAmount(new BigDecimal("6.00"));
        return order;
    }

    private AssetResultMessageNotificationServiceImpl service() {
        return new AssetResultMessageNotificationServiceImpl(
                coinPackageDao, userAssetDao, eventPublisher, inboxService, afterCommitExecutor);
    }
}
