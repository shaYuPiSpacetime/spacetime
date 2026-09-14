package com.spacetime.admin.task;

import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.service.WechatVirtualRefundGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 定时推进微信虚拟支付退款渠道终态及退款后的权益回收。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VirtualPaymentRefundReconcileJob {
    private static final int BATCH_SIZE = 100;

    private final RefundRecordDao refundRecordDao;
    private final FinanceAdminService financeAdminService;
    private final WechatVirtualRefundGateway virtualRefundGateway;

    @Scheduled(fixedDelayString = "${wechat-virtual-pay.refund-reconcile-delay-ms:30000}")
    public void reconcileRefunds() {
        if (!virtualRefundGateway.isEnabled()) {
            return;
        }
        for (RefundRecord refund : refundRecordDao.selectReconcilableVirtualRefunds(BATCH_SIZE)) {
            try {
                financeAdminService.reconcileVirtualRefund(refund.getId());
            } catch (RuntimeException exception) {
                log.warn("微信虚拟支付退款补偿失败，稍后重试: refundNo={}, message={}",
                        refund.getRefundNo(), exception.getMessage());
            }
        }
    }
}
