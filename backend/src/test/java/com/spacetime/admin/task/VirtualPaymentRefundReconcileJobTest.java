package com.spacetime.admin.task;

import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.mapper.RefundRecordMapper;
import com.spacetime.common.service.WechatVirtualRefundGateway;
import org.junit.jupiter.api.Test;
import org.apache.ibatis.annotations.Select;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VirtualPaymentRefundReconcileJobTest {

    @Test
    void reconcileQueryShouldIncludeChannelPendingAndAssetRollbackPendingRows() throws Exception {
        Select select = RefundRecordMapper.class
                .getMethod("selectReconcilableVirtualRefunds", int.class)
                .getAnnotation(Select.class);
        String sql = String.join(" ", select.value());

        assertThat(sql)
                .contains("r.refund_status='processing'", "o.order_status='refunding'")
                .contains("r.refund_status='success'", "r.asset_rollback_action='pending'",
                        "o.order_status='refunded'");
    }

    @Test
    void shouldSkipRefundReconcileWhenVirtualPayIsDisabled() {
        RefundRecordDao refundRecordDao = mock(RefundRecordDao.class);
        FinanceAdminService financeAdminService = mock(FinanceAdminService.class);
        WechatVirtualRefundGateway gateway = mock(WechatVirtualRefundGateway.class);
        when(gateway.isEnabled()).thenReturn(false);

        new VirtualPaymentRefundReconcileJob(refundRecordDao, financeAdminService, gateway)
                .reconcileRefunds();

        verify(refundRecordDao, never()).selectReconcilableVirtualRefunds(100);
    }

    @Test
    void shouldContinueReconcilingRemainingRefundsAfterOneFailure() {
        RefundRecordDao refundRecordDao = mock(RefundRecordDao.class);
        FinanceAdminService financeAdminService = mock(FinanceAdminService.class);
        WechatVirtualRefundGateway gateway = mock(WechatVirtualRefundGateway.class);
        when(gateway.isEnabled()).thenReturn(true);
        RefundRecord first = refund(1L, "RF-1");
        RefundRecord second = refund(2L, "RF-2");
        when(refundRecordDao.selectReconcilableVirtualRefunds(100)).thenReturn(List.of(first, second));
        doThrow(new IllegalStateException("微信接口暂时不可用"))
                .when(financeAdminService).reconcileVirtualRefund(1L);

        new VirtualPaymentRefundReconcileJob(refundRecordDao, financeAdminService, gateway)
                .reconcileRefunds();

        verify(financeAdminService).reconcileVirtualRefund(1L);
        verify(financeAdminService).reconcileVirtualRefund(2L);
    }

    private RefundRecord refund(Long id, String refundNo) {
        RefundRecord refund = new RefundRecord();
        refund.setId(id);
        refund.setRefundNo(refundNo);
        refund.setRefundStatus("processing");
        return refund;
    }
}
