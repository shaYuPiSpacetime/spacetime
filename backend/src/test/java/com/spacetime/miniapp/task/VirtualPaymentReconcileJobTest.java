package com.spacetime.miniapp.task;

import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.miniapp.service.PaymentService;
import com.spacetime.miniapp.service.WechatVirtualPayService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VirtualPaymentReconcileJobTest {

    @Test
    void shouldSkipReconcileWhenVirtualPayIsDisabled() {
        TradeOrderDao orderDao = mock(TradeOrderDao.class);
        PaymentService paymentService = mock(PaymentService.class);
        WechatVirtualPayService virtualPayService = mock(WechatVirtualPayService.class);
        when(virtualPayService.isEnabled()).thenReturn(false);

        new VirtualPaymentReconcileJob(orderDao, paymentService, virtualPayService)
                .reconcilePendingOrders();

        verify(orderDao, never()).selectPendingVirtualOrders(100);
    }

    @Test
    void shouldContinueReconcilingRemainingOrdersAfterOneFailure() {
        TradeOrderDao orderDao = mock(TradeOrderDao.class);
        PaymentService paymentService = mock(PaymentService.class);
        WechatVirtualPayService virtualPayService = mock(WechatVirtualPayService.class);
        when(virtualPayService.isEnabled()).thenReturn(true);

        TradeOrder first = virtualOrder(1L, 11L, "TO-1");
        TradeOrder second = virtualOrder(2L, 22L, "TO-2");
        when(orderDao.selectPendingVirtualOrders(100)).thenReturn(List.of(first, second));
        doThrow(new IllegalStateException("微信接口暂时不可用"))
                .when(paymentService).confirmWechatPay(11L, 1L);

        new VirtualPaymentReconcileJob(orderDao, paymentService, virtualPayService)
                .reconcilePendingOrders();

        verify(paymentService).confirmWechatPay(11L, 1L);
        verify(paymentService).confirmWechatPay(22L, 2L);
    }

    private TradeOrder virtualOrder(Long id, Long userId, String orderNo) {
        TradeOrder order = new TradeOrder();
        order.setId(id);
        order.setUserId(userId);
        order.setOrderNo(orderNo);
        order.setPayChannel("wechat_virtual");
        order.setOrderStatus("unpaid");
        return order;
    }
}
