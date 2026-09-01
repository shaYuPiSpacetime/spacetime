package com.spacetime.miniapp.task;

import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.miniapp.service.PaymentService;
import com.spacetime.miniapp.service.WechatVirtualPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 定时补偿客户端中断后未确认的微信虚拟支付订单。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VirtualPaymentReconcileJob {
    private static final int BATCH_SIZE = 100;

    private final TradeOrderDao tradeOrderDao;
    private final PaymentService paymentService;
    private final WechatVirtualPayService wechatVirtualPayService;

    @Scheduled(fixedDelayString = "${wechat-virtual-pay.reconcile-delay-ms:30000}")
    public void reconcilePendingOrders() {
        if (!wechatVirtualPayService.isEnabled()) {
            return;
        }
        for (TradeOrder order : tradeOrderDao.selectPendingVirtualOrders(BATCH_SIZE)) {
            try {
                paymentService.confirmWechatPay(order.getUserId(), order.getId());
            } catch (RuntimeException ex) {
                log.warn("微信虚拟支付订单补偿失败，稍后重试: orderNo={}, message={}",
                        order.getOrderNo(), ex.getMessage());
            }
        }
    }
}
