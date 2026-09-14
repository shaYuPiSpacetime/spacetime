package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RefundReq;
import com.spacetime.admin.dto.response.ReconcileDailyVO;
import com.spacetime.admin.service.impl.FinanceAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.enums.OrderStatusEnum;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.WechatVirtualRefundGateway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("财务退款服务测试")
class FinanceAdminServiceImplTest {

    @Mock private TradeOrderDao tradeOrderDao;
    @Mock private UserCoinLogDao userCoinLogDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserDao userDao;
    @Mock private AppUserDao appUserDao;
    @Mock private RefundRecordDao refundRecordDao;
    @Mock private AssetResultMessageNotificationService assetResultNotificationService;
    @Mock private WechatVirtualRefundGateway virtualRefundGateway;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private TransactionStatus transactionStatus;
    @InjectMocks private FinanceAdminServiceImpl service;

    @BeforeEach
    void setUpTransactionManager() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
    }

    @Test
    @DisplayName("发起虚拟支付退款后只进入退款中，不能在渠道确认前伪造成功")
    void processRefund_virtualPaymentShouldRemainRefundingUntilChannelTerminal() {
        TradeOrder order = paidVirtualVipOrder();
        lenient().when(tradeOrderDao.selectById(1L)).thenReturn(order);
        lenient().when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        lenient().when(appUserDao.selectById(7L)).thenReturn(user);
        lenient().when(virtualRefundGateway.isEnabled()).thenReturn(true);
        lenient().when(virtualRefundGateway.queryPaymentOrder("openid-7", "TO12345678"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        4, 100, "{\"status\":4,\"left_fee\":100}"));
        lenient().when(virtualRefundGateway.requestRefund(
                        "openid-7", "TO12345678", "RF000000000000000001", 100, 100, "用户申请退款"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundRequestResult(
                        "RF000000000000000001", "WXRF-1", "TO12345678", "WXPAY-1", "{\"errcode\":0}"));
        RefundReq req = new RefundReq();
        req.setReason("用户申请退款");
        req.setRefundAmount(new BigDecimal("1.00"));
        req.setAssetRollbackAction("skip_by_client");

        service.processRefund(1L, req);

        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDING.getCode());
        verify(virtualRefundGateway).requestRefund(
                "openid-7", "TO12345678", "RF000000000000000001", 100, 100, "用户申请退款");
        verify(refundRecordDao).insert(argThat(refund ->
                "processing".equals(refund.getRefundStatus())
                        && "accepted".equals(refund.getChannelRefundStatus())
                        && "pending".equals(refund.getAssetRollbackAction())
                        && "WXRF-1".equals(refund.getChannelRefundNo())));
        verify(refundRecordDao, never()).updateById(argThat(refund ->
                "success".equals(refund.getRefundStatus())
                        || "manual_recorded".equals(refund.getChannelRefundStatus())));
        verify(userAssetDao, never()).updateById(any());
        var ordered = inOrder(transactionManager, virtualRefundGateway);
        ordered.verify(transactionManager).commit(transactionStatus);
        ordered.verify(virtualRefundGateway).queryPaymentOrder("openid-7", "TO12345678");
    }

    @Test
    @DisplayName("财务服务应提供虚拟支付退款终态对账入口")
    void shouldExposeVirtualRefundReconcileOperation() {
        assertThat(Arrays.stream(FinanceAdminServiceImpl.class.getMethods())
                .map(method -> method.getName()))
                .contains("reconcileVirtualRefund");
    }

    @Test
    @DisplayName("原支付单预检失败时保留失败审计并恢复已支付状态")
    void processRefund_precheckRejectedShouldKeepFailedAuditAndRestorePaidState() {
        TradeOrder order = paidVirtualVipOrder();
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.isEnabled()).thenReturn(true);
        when(virtualRefundGateway.queryPaymentOrder("openid-7", "TO12345678"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        1, 100, "{\"status\":1,\"left_fee\":100}"));
        RefundReq req = new RefundReq();
        req.setReason("用户申请退款");
        req.setRefundAmount(new BigDecimal("1.00"));

        assertThatThrownBy(() -> service.processRefund(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不是可退款状态");

        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.SUCCESS.getCode());
        verify(refundRecordDao).insert(any());
        verify(refundRecordDao).updateById(argThat(refund ->
                "failed".equals(refund.getRefundStatus())
                        && "precheck_failed".equals(refund.getChannelRefundStatus())));
        verify(virtualRefundGateway, never()).requestRefund(any(), any(), any(), any(Integer.class),
                any(Integer.class), any());
        verify(userAssetDao, never()).updateById(any());
    }

    @Test
    @DisplayName("退款请求结果未知时保留已提交退款意图供定时查单")
    void processRefund_requestUnknownShouldKeepDurableRefundIntent() {
        TradeOrder order = paidVirtualVipOrder();
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.isEnabled()).thenReturn(true);
        when(virtualRefundGateway.queryPaymentOrder("openid-7", "TO12345678"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        4, 100, "{\"status\":4,\"left_fee\":100}"));
        when(virtualRefundGateway.requestRefund(any(), any(), any(), eq(100), eq(100), any()))
                .thenThrow(new BusinessException("微信虚拟支付退款申请超时"));
        RefundReq req = new RefundReq();
        req.setReason("用户申请退款");
        req.setRefundAmount(new BigDecimal("1.00"));

        assertThatThrownBy(() -> service.processRefund(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("超时");

        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDING.getCode());
        verify(refundRecordDao).insert(argThat(refund ->
                "processing".equals(refund.getRefundStatus())
                        && "request_unknown".equals(refund.getChannelRefundStatus())));
    }

    @Test
    @DisplayName("虚拟商品部分退款必须在落退款意图前拒绝")
    void processRefund_partialRefundShouldBeRejectedBeforeRemoteRequest() {
        TradeOrder order = paidVirtualVipOrder();
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(virtualRefundGateway.isEnabled()).thenReturn(true);
        RefundReq req = new RefundReq();
        req.setReason("申请部分退款");
        req.setRefundAmount(new BigDecimal("0.50"));

        assertThatThrownBy(() -> service.processRefund(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("暂不支持部分退款");

        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.SUCCESS.getCode());
        verify(refundRecordDao, never()).insert(any());
        verify(virtualRefundGateway, never()).queryPaymentOrder(any(), any());
        verify(virtualRefundGateway, never()).requestRefund(any(), any(), any(), any(Integer.class),
                any(Integer.class), any());
    }

    @Test
    @DisplayName("渠道剩余可退金额大于本地全额时也不得发起部分退款")
    void processRefund_channelLeftFeeGreaterThanLocalFullAmountShouldReject() {
        TradeOrder order = paidVirtualVipOrder();
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.isEnabled()).thenReturn(true);
        when(virtualRefundGateway.queryPaymentOrder("openid-7", "TO12345678"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        4, 200, "{\"status\":4,\"left_fee\":200}"));
        RefundReq req = new RefundReq();
        req.setReason("用户申请全额退款");
        req.setRefundAmount(new BigDecimal("1.00"));

        assertThatThrownBy(() -> service.processRefund(1L, req))
                .isInstanceOf(BusinessException.class);

        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.SUCCESS.getCode());
        verify(virtualRefundGateway, never()).requestRefund(any(), any(), any(), any(Integer.class),
                any(Integer.class), any());
    }

    @Test
    @DisplayName("渠道终态失败后重试必须新增退款尝试并保留旧审计")
    void processRefund_retryAfterTerminalFailureShouldCreateNewAttemptWithNewRefundNo() {
        TradeOrder order = paidVirtualVipOrder();
        RefundRecord failed = processingRefund();
        failed.setRefundNo("RF-FAILED-ATTEMPT-1");
        failed.setRefundStatus("failed");
        failed.setChannelRefundStatus("failed");
        failed.setChannelResponseSummary("旧退款尝试失败");
        failed.setAssetRollbackAction(null);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(refundRecordDao.selectByOrderId(1L)).thenReturn(failed);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.isEnabled()).thenReturn(true);
        when(virtualRefundGateway.queryPaymentOrder("openid-7", "TO12345678"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        4, 100, "{\"status\":4,\"left_fee\":100}"));
        when(virtualRefundGateway.requestRefund(
                eq("openid-7"), eq("TO12345678"), anyString(), eq(100), eq(100), any()))
                .thenAnswer(invocation -> {
                    String newRefundNo = invocation.getArgument(2);
                    return new WechatVirtualRefundGateway.VirtualRefundRequestResult(
                            newRefundNo, "WXRF-NEW", "TO12345678", "WXPAY-1", "{\"errcode\":0}");
                });
        RefundReq req = new RefundReq();
        req.setReason("再次申请退款");
        req.setRefundAmount(new BigDecimal("1.00"));

        service.processRefund(1L, req);

        assertThat(failed.getRefundStatus()).isEqualTo("failed");
        assertThat(failed.getChannelRefundStatus()).isEqualTo("failed");
        assertThat(failed.getChannelResponseSummary()).isEqualTo("旧退款尝试失败");
        verify(refundRecordDao, never()).updateById(same(failed));
        verify(refundRecordDao).insert(argThat(refund ->
                refund != failed && !failed.getRefundNo().equals(refund.getRefundNo())));
        verify(virtualRefundGateway).requestRefund(
                eq("openid-7"), eq("TO12345678"),
                argThat(refundNo -> !failed.getRefundNo().equals(refundNo)),
                eq(100), eq(100), eq("再次申请退款"));
    }

    @Test
    @DisplayName("渠道退款成功后回收VIP权益并且重复对账不重复回收")
    void reconcileVirtualRefund_successShouldRollbackVipExactlyOnce() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        UserAsset asset = new UserAsset();
        asset.setId(20L);
        asset.setUserId(7L);
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(60));
        asset.setTotalRecharge(new BigDecimal("2.00"));
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);

        service.reconcileVirtualRefund(10L);
        service.reconcileVirtualRefund(10L);

        assertThat(refund.getRefundStatus()).isEqualTo("success");
        assertThat(refund.getChannelRefundStatus()).isEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("vip_membership_reversed");
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDED.getCode());
        assertThat(asset.getVipExpireTime()).isBefore(LocalDateTime.now().plusDays(31));
        assertThat(asset.getTotalRecharge()).isEqualByComparingTo("1.00");
        verify(virtualRefundGateway, times(1)).queryRefund("openid-7", refund.getRefundNo());
        verify(userAssetDao, times(1)).updateById(asset);
        verify(assetResultNotificationService, times(1)).publishOrderAfterCommit(eq(order), any());
    }

    @Test
    @DisplayName("渠道退款失败时订单退回已支付且不回收权益")
    void reconcileVirtualRefund_failedShouldRestorePaidStateWithoutAssetRollback() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 7, 1, 100, 0L, "{\"status\":7}"));

        service.reconcileVirtualRefund(10L);

        assertThat(refund.getRefundStatus()).isEqualTo("failed");
        assertThat(refund.getChannelRefundStatus()).isEqualTo("failed");
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.SUCCESS.getCode());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(userAssetDao, never()).updateById(any());
    }

    @Test
    @DisplayName("渠道退款已成功但千寻币不足时仍记录渠道终态并转人工复核")
    void reconcileVirtualRefund_insufficientCoinShouldKeepChannelSuccessAndMarkManualReview() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderType("coin");
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        UserCoinLog purchaseLog = purchaseCoinLog(110);
        UserAsset asset = new UserAsset();
        asset.setId(20L);
        asset.setUserId(7L);
        asset.setCoinBalance(20);
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));
        when(userCoinLogDao.selectPurchaseByOrderId(1L)).thenReturn(purchaseLog);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);

        assertThatCode(() -> service.reconcileVirtualRefund(10L)).doesNotThrowAnyException();

        assertThat(refund.getRefundStatus()).isEqualTo("success");
        assertThat(refund.getChannelRefundStatus()).isEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).startsWith("manual_review");
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDED.getCode());
        verify(userAssetDao, never()).updateById(any());
    }

    @Test
    @DisplayName("渠道终态金额不匹配时不得宣称整笔退款成功")
    void reconcileVirtualRefund_channelAmountMismatchShouldNotClaimFullRefundSuccess() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 50, 1780000000L, "{\"status\":5}"));

        assertThatCode(() -> service.reconcileVirtualRefund(10L)).doesNotThrowAnyException();

        assertThat(refund.getRefundStatus()).isNotEqualTo("success");
        assertThat(refund.getChannelRefundStatus()).isNotEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("manual_review:channel_mismatch");
        assertThat(order.getOrderStatus()).isNotEqualTo(OrderStatusEnum.REFUNDED.getCode());
        verify(userAssetDao, never()).updateById(any());
        verify(assetResultNotificationService, never()).publishOrderAfterCommit(any(), any());
    }

    @Test
    @DisplayName("VIP订单缺少历史权益快照时渠道成功不回滚，只转人工复核")
    void reconcileVirtualRefund_vipWithoutOrderSnapshotShouldRequireManualReview() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        order.setSuccessTime(null);
        order.setExpireTime(null);
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));

        assertThatCode(() -> service.reconcileVirtualRefund(10L)).doesNotThrowAnyException();

        assertThat(refund.getRefundStatus()).isEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("manual_review:asset_unavailable");
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDED.getCode());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(userAssetDao, never()).updateById(any());
    }

    @Test
    @DisplayName("退款请求结果未知时用同一退款单号幂等重提并最终完成对账")
    void reconcileVirtualRefund_requestUnknownShouldResubmitSameRefundNoAndReachTerminalState() {
        RefundRecord refund = processingRefund();
        refund.setChannelRefundStatus("request_unknown");
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        UserAsset asset = new UserAsset();
        asset.setId(20L);
        asset.setUserId(7L);
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(60));
        asset.setTotalRecharge(new BigDecimal("2.00"));
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenThrow(new BusinessException("退款单暂未查到"))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));
        when(virtualRefundGateway.queryPaymentOrder("openid-7", order.getOrderNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot(
                        4, 100, "{\"status\":4,\"left_fee\":100}"));
        when(virtualRefundGateway.requestRefund(
                "openid-7", order.getOrderNo(), refund.getRefundNo(), 100, 100, refund.getRefundReason()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundRequestResult(
                        refund.getRefundNo(), "WXRF-1", order.getOrderNo(), "WXPAY-1", "{\"errcode\":0}"));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);

        service.reconcileVirtualRefund(10L);
        assertThat(refund.getChannelRefundStatus()).isEqualTo("accepted");
        assertThat(order.getOrderStatus()).isEqualTo(OrderStatusEnum.REFUNDING.getCode());

        service.reconcileVirtualRefund(10L);

        assertThat(refund.getRefundStatus()).isEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("vip_membership_reversed");
        verify(virtualRefundGateway).requestRefund(
                "openid-7", order.getOrderNo(), refund.getRefundNo(), 100, 100, refund.getRefundReason());
        verify(virtualRefundGateway, times(2)).queryRefund("openid-7", refund.getRefundNo());
    }

    @Test
    @DisplayName("千寻币订单退款成功后原子扣回整包币且只执行一次")
    void reconcileVirtualRefund_successShouldDeductPurchasedCoinsExactlyOnce() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderType("coin");
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        UserCoinLog purchaseLog = purchaseCoinLog(110);
        UserAsset asset = new UserAsset();
        asset.setId(20L);
        asset.setUserId(7L);
        asset.setCoinBalance(200);
        asset.setTotalRecharge(new BigDecimal("2.00"));
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));
        when(userCoinLogDao.selectPurchaseByOrderId(1L)).thenReturn(purchaseLog);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);

        service.reconcileVirtualRefund(10L);
        service.reconcileVirtualRefund(10L);

        assertThat(asset.getCoinBalance()).isEqualTo(90);
        assertThat(asset.getTotalRecharge()).isEqualByComparingTo("1.00");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("coin_purchase_reversed");
        verify(userAssetDao, times(1)).updateById(asset);
        verify(userCoinLogDao, times(1)).insert(argThat(log ->
                Integer.valueOf(-110).equals(log.getChangeAmount())
                        && Integer.valueOf(200).equals(log.getBalanceBefore())
                        && Integer.valueOf(90).equals(log.getBalanceAfter())));
    }

    @Test
    @DisplayName("千寻币订单缺少原充值流水时不按当前套餐猜测并转人工复核")
    void reconcileVirtualRefund_coinWithoutPurchaseLogShouldRequireManualReview() {
        RefundRecord refund = processingRefund();
        TradeOrder order = paidVirtualVipOrder();
        order.setOrderType("coin");
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        UserAsset asset = new UserAsset();
        asset.setId(20L);
        asset.setUserId(7L);
        asset.setCoinBalance(200);
        when(refundRecordDao.selectById(10L)).thenReturn(refund);
        when(refundRecordDao.selectByIdForUpdate(10L)).thenReturn(refund);
        when(tradeOrderDao.selectById(1L)).thenReturn(order);
        when(tradeOrderDao.selectByIdForUpdate(1L)).thenReturn(order);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(virtualRefundGateway.queryRefund("openid-7", refund.getRefundNo()))
                .thenReturn(new WechatVirtualRefundGateway.VirtualRefundQueryResult(
                        refund.getRefundNo(), "WXRF-1", 5, 1, 100, 1780000000L, "{\"status\":5}"));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);

        service.reconcileVirtualRefund(10L);

        assertThat(refund.getRefundStatus()).isEqualTo("success");
        assertThat(refund.getAssetRollbackAction()).isEqualTo("manual_review:asset_unavailable");
        assertThat(asset.getCoinBalance()).isEqualTo(200);
        verify(userAssetDao, never()).updateById(any());
        verify(userCoinLogDao, never()).insert(any());
    }

    @Test
    @DisplayName("每日退款金额只汇总渠道已成功的退款记录")
    void getReconcileDaily_shouldOnlySumSuccessfulRefunds() {
        Page<TradeOrder> orderPage = new Page<>(1, 10000);
        orderPage.setRecords(List.of());
        Page<RefundRecord> refundPage = new Page<>(1, 10000);
        refundPage.setRecords(List.of(
                refundWithStatusAndAmount("processing", "1.00"),
                refundWithStatusAndAmount("failed", "2.00"),
                refundWithStatusAndAmount("success", "3.00")
        ));
        when(tradeOrderDao.selectPage(any(), any())).thenReturn(orderPage);
        when(refundRecordDao.selectPage(any(), any())).thenReturn(refundPage);

        ReconcileDailyVO result = service.getReconcileDaily("2026-09-14");

        assertThat(result.getRefundAmount()).isEqualByComparingTo("3.00");
    }

    private RefundRecord refundWithStatusAndAmount(String status, String amount) {
        RefundRecord refund = new RefundRecord();
        refund.setRefundStatus(status);
        refund.setRefundAmount(new BigDecimal(amount));
        return refund;
    }

    private RefundRecord processingRefund() {
        RefundRecord refund = new RefundRecord();
        refund.setId(10L);
        refund.setRefundNo("RF000000000000000001");
        refund.setOrderId(1L);
        refund.setOrderNo("TO12345678");
        refund.setUserId(7L);
        refund.setRefundAmount(new BigDecimal("1.00"));
        refund.setRefundReason("用户申请退款");
        refund.setRefundStatus("processing");
        refund.setChannelRefundStatus("accepted");
        return refund;
    }

    private UserCoinLog purchaseCoinLog(int purchasedCoins) {
        UserCoinLog log = new UserCoinLog();
        log.setId(30L);
        log.setUserId(7L);
        log.setFlowType("recharge");
        log.setBizScene("coin_recharge");
        log.setRefId(1L);
        log.setRefType("trade_order");
        log.setChangeAmount(purchasedCoins);
        return log;
    }

    private TradeOrder paidVirtualVipOrder() {
        TradeOrder order = new TradeOrder();
        order.setId(1L);
        order.setOrderNo("TO12345678");
        order.setUserId(7L);
        order.setOrderType("vip");
        order.setPackageId(3L);
        order.setPackageName("月度会员");
        order.setPayAmount(new BigDecimal("1.00"));
        order.setPayChannel("wechat_virtual");
        order.setOrderStatus(OrderStatusEnum.SUCCESS.getCode());
        LocalDateTime successTime = LocalDateTime.now().minusDays(1);
        order.setSuccessTime(successTime);
        order.setExpireTime(successTime.plusDays(30));
        return order;
    }
}
